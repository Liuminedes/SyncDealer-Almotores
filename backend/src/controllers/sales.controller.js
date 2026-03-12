import { Op, literal } from "sequelize";
import Sale from "../models/Sale.js";
import User from "../models/User.js";
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
  } else if (advisor_id) {
    conditions.push({ advisor_id: Number(advisor_id) });
  }

  // Filtro por mes: usa SOLO sale_date para evitar inconsistencias con cut_month mal guardado
  if (cut_year && cut_month) {
    const y = String(cut_year);
    const m = String(cut_month).padStart(2, "0");
    const lastDay = new Date(Number(y), Number(m), 0).getDate(); // último día real del mes
    conditions.push(literal(`sale_date BETWEEN '${y}-${m}-01' AND '${y}-${m}-${lastDay}'`));
  } else if (date_from && date_to) {
    conditions.push(literal(`sale_date BETWEEN '${date_from}' AND '${date_to}'`));
  }

  if (q) {
    conditions.push({
      [Op.or]: [
        { invoice: { [Op.like]: `%${q}%` } },
        { client_name: { [Op.like]: `%${q}%` } },
        { plate: { [Op.like]: `%${q}%` } },
      ],
    });
  }

  const where = conditions.length ? { [Op.and]: conditions } : {};
  const offset = (Number(page) - 1) * Number(limit);

  const { rows, count } = await Sale.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [["sale_date", "DESC"]],
    include: [
      { model: User, as: "advisor", attributes: ["id", "full_name", "email"] },
      { model: Vehicle, as: "vehicle", attributes: ["id", "code", "model", "version"] },
    ],
  });

  res.json({ data: { items: rows, total: count, page: Number(page), limit: Number(limit) } });
};

export const create = async (req, res) => {
  // Parsear fecha como local para evitar bug de timezone UTC
  const [y, m, d] = String(req.body.sale_date).split("-").map(Number);
  const sale = await Sale.create({
    ...req.body,
    cut_month: m,
    fortnight: d <= 15 ? "FIRST" : "SECOND",
    charge_month: null,
  });
  res.status(201).json({ sale });
};

export const getById = async (req, res) => {
  const sale = await Sale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ message: "Venta no encontrada" });
  res.json({ sale });
};

export const update = async (req, res) => {
  const sale = await Sale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ message: "Venta no encontrada" });
  const [y, m, d] = String(req.body.sale_date).split("-").map(Number);
  await sale.update({
    ...req.body,
    cut_month: m,
    fortnight: d <= 15 ? "FIRST" : "SECOND",
    charge_month: null,
  });
  res.json({ sale });
};