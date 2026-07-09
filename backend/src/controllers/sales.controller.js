// backend/src/controllers/sales.controller.js
// CAMBIOS: +removeBulk (DELETE /bulk)
import { Op, literal } from "sequelize";
import Sale    from "../models/Sale.js";
import User    from "../models/User.js";
import Vehicle from "../models/Vehicle.js";

export const list = async (req, res) => {
  const {
    page = 1, limit = 10,
    q, brand_id, advisor_id,
    cut_month, cut_year,
    date_from, date_to,
  } = req.query;

  const conditions = [];
  if (brand_id) conditions.push({ brand_id: Number(brand_id) });

  const role = String(req.user?.role || "").toUpperCase();
  if (role === "ADVISOR") {
    conditions.push({ advisor_id: req.user.id });
  } else if (advisor_id === "none") {
    // Ventas sin asesor asignado
    conditions.push({ advisor_id: null });
  } else if (advisor_id) {
    conditions.push({ advisor_id: Number(advisor_id) });
  }

  if (cut_year && cut_month) {
    const y = String(cut_year);
    const m = String(cut_month).padStart(2, "0");
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    conditions.push(literal(`sale_date BETWEEN '${y}-${m}-01' AND '${y}-${m}-${lastDay}'`));
  } else if (date_from && date_to) {
    conditions.push(literal(`sale_date BETWEEN '${date_from}' AND '${date_to}'`));
  }

  if (q) {
    conditions.push({
      [Op.or]: [
        { invoice:     { [Op.like]: `%${q}%` } },
        { client_name: { [Op.like]: `%${q}%` } },
        { plate:       { [Op.like]: `%${q}%` } },
      ],
    });
  }

  const where  = conditions.length ? { [Op.and]: conditions } : {};
  const offset = (Number(page) - 1) * Number(limit);

  const { rows, count } = await Sale.findAndCountAll({
    where, limit: Number(limit), offset,
    order: [["sale_date", "DESC"]],
    include: [
      { model: User,    as: "advisor", attributes: ["id", "full_name", "email"] },
      { model: Vehicle, as: "vehicle", attributes: ["id", "code", "model", "version"] },
    ],
  });

  res.json({ data: { items: rows, total: count, page: Number(page), limit: Number(limit) } });
};

export const getById = async (req, res) => {
  const sale = await Sale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ message: "Venta no encontrada" });
  res.json({ sale });
};

export const create = async (req, res) => {
  const [, m, d] = String(req.body.sale_date).split("-").map(Number);
  const sale = await Sale.create({
    ...req.body,
    cut_month:    m,
    fortnight:    d <= 15 ? "FIRST" : "SECOND",
    charge_month: null,
  });
  res.status(201).json({ sale });
};

export const update = async (req, res) => {
  const sale = await Sale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ message: "Venta no encontrada" });
  const [, m, d] = String(req.body.sale_date).split("-").map(Number);
  await sale.update({
    ...req.body,
    cut_month:    m,
    fortnight:    d <= 15 ? "FIRST" : "SECOND",
    charge_month: null,
  });
  res.json({ sale });
};

// ── Eliminación individual ────────────────────────────────────────────────────
export const remove = async (req, res) => {
  const sale = await Sale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ message: "Venta no encontrada" });

  const force = req.query.force === "true" || req.body?.force === true;

  const { sequelize } = sale;
  if (sequelize) {
    const [rows] = await sequelize.query(
      `SELECT cr.id, cr.status
       FROM commission_run_items cri
       JOIN commission_runs cr ON cr.id = cri.run_id
       WHERE cri.sale_id = :sale_id
         AND cr.status NOT IN ('DRAFT', 'CALCULATED')
       LIMIT 1`,
      { replacements: { sale_id: sale.id } }
    );
    if (rows?.length > 0 && !force) {
      return res.status(409).json({
        requiresForce:    true,
        commissionStatus: rows[0].status,
        message: `Esta venta pertenece a una comisión en estado "${rows[0].status}". ¿Confirmas que deseas eliminarla?`,
      });
    }
  }

  await sale.destroy();
  res.json({ ok: true, message: "Venta eliminada correctamente" });
};

// ── Eliminación masiva ────────────────────────────────────────────────────────
// Body: { ids: [1,2,3,...], force: true|false }
// Responde con: { deleted, skipped: [{ id, reason, commissionStatus }] }
export const removeBulk = async (req, res) => {
  const ids   = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  const force = req.body?.force === true;

  if (!ids.length) return res.status(400).json({ message: "Se requiere al menos un id en ids[]" });

  const sales = await Sale.findAll({ where: { id: { [Op.in]: ids } } });
  if (!sales.length) return res.status(404).json({ message: "No se encontraron las ventas indicadas" });

  const { sequelize } = sales[0];

  // Verificar qué ventas están en comisiones avanzadas
  let blockedMap = {};
  if (sequelize) {
    const [rows] = await sequelize.query(
      `SELECT cri.sale_id, cr.status
       FROM commission_run_items cri
       JOIN commission_runs cr ON cr.id = cri.run_id
       WHERE cri.sale_id IN (:ids)
         AND cr.status NOT IN ('DRAFT', 'CALCULATED')`,
      { replacements: { ids } }
    );
    for (const r of rows || []) {
      blockedMap[Number(r.sale_id)] = r.status;
    }
  }

  const skipped  = [];
  const toDelete = [];

  for (const sale of sales) {
    const blocked = blockedMap[Number(sale.id)];
    if (blocked && !force) {
      skipped.push({ id: sale.id, commissionStatus: blocked,
        reason: `Comisión en estado "${blocked}"` });
    } else {
      toDelete.push(sale);
    }
  }

  // Si hay bloqueadas y no viene force → informar al frontend sin eliminar nada
  if (skipped.length > 0 && !force) {
    return res.status(409).json({
      requiresForce: true,
      skipped,
      message: `${skipped.length} venta(s) pertenecen a comisiones en estado avanzado. ¿Deseas eliminarlas de todas formas?`,
    });
  }

  // Eliminar todas las que corresponda
  let deleted = 0;
  for (const sale of toDelete) {
    await sale.destroy();
    deleted++;
  }

  res.json({
    ok: true,
    message: `${deleted} venta(s) eliminada(s)${skipped.length ? `, ${skipped.length} omitida(s)` : ""}`,
    data: { deleted, skipped },
  });
};
