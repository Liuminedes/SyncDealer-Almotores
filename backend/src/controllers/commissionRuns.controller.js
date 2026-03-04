import { sequelize } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

export async function listRuns(req, res, next) {
  try {
    const q = req.validated?.query || req.query;
    const brandCode = (req.brand?.code || q.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const page = Number(q.page || 1);
    const limit = Number(q.limit || 10);
    const offset = (page - 1) * limit;

    const replacements = {
      brandCode, limit, offset,
      advisor_id: q.advisor_id ? Number(q.advisor_id) : null,
      cut_year:   q.cut_year   ? Number(q.cut_year)   : null,
      cut_month:  q.cut_month  ? Number(q.cut_month)  : null,
      fortnight:  q.fortnight  || null,
      status:     q.status     || null,
    };

    const where = `
      WHERE b.code = :brandCode
      ${replacements.advisor_id ? " AND cr.advisor_id = :advisor_id " : ""}
      ${replacements.cut_year   ? " AND cr.cut_year   = :cut_year   " : ""}
      ${replacements.cut_month  ? " AND cr.cut_month  = :cut_month  " : ""}
      ${replacements.fortnight  ? " AND cr.fortnight  = :fortnight  " : ""}
      ${replacements.status     ? " AND cr.status     = :status     " : ""}
    `;

    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) as total FROM commission_runs cr JOIN brands b ON b.id = cr.brand_id ${where}`,
      { replacements }
    );

    const [rows] = await sequelize.query(
      `SELECT cr.*, b.code as brand_code, b.name as brand_name,
              u.full_name as advisor_name, u.email as advisor_email
       FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       JOIN users  u ON u.id = cr.advisor_id
       ${where}
       ORDER BY cr.id DESC
       LIMIT :limit OFFSET :offset`,
      { replacements }
    );

    res.json({ ok: true, data: { items: rows || [], total: Number(countRows?.[0]?.total || 0), page, limit } });
  } catch (err) { next(err); }
}

export async function getRunById(req, res, next) {
  try {
    const p = req.validated?.params || req.params;
    const runId = Number(p.id);
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const [runs] = await sequelize.query(
      `SELECT cr.*, b.code as brand_code, b.name as brand_name,
              u.full_name as advisor_name, u.email as advisor_email
       FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       JOIN users  u ON u.id = cr.advisor_id
       WHERE cr.id = :runId AND b.code = :brandCode LIMIT 1`,
      { replacements: { runId, brandCode } }
    );

    const run = runs?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    const [items] = await sequelize.query(
      `SELECT cri.*, s.sale_date, s.invoice, s.client_name, s.plate,
              s.cut_month as sale_cut_month, s.fortnight as sale_fortnight,
              v.code as vehicle_code, v.model as vehicle_model, v.version as vehicle_version
       FROM commission_run_items cri
       JOIN sales    s ON s.id = cri.sale_id
       JOIN vehicles v ON v.id = cri.vehicle_id
       WHERE cri.run_id = :runId ORDER BY cri.id ASC`,
      { replacements: { runId } }
    );

    res.json({ ok: true, data: { run, items: items || [] } });
  } catch (err) { next(err); }
}

export async function calculateRun(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const b = req.validated?.body || req.body;
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const advisorId = Number(b.advisor_id);
    const cutYear   = Number(b.cut_year);
    const cutMonth  = Number(b.cut_month);
    const fortnight = String(b.fortnight || "").toUpperCase();

    if (!advisorId || !cutYear || !cutMonth || !fortnight)
      throw new HttpError(400, "advisor_id, cut_year, cut_month y fortnight son obligatorios");
    if (!["FIRST", "SECOND"].includes(fortnight))
      throw new HttpError(400, "fortnight inválido");

    // 1) Brand
    const [brandRows] = await sequelize.query(
      `SELECT id FROM brands WHERE code = :brand_code LIMIT 1`,
      { replacements: { brand_code: brandCode }, transaction: t }
    );
    const brandId = brandRows?.[0]?.id;
    if (!brandId) throw new HttpError(400, `Marca no encontrada (${brandCode})`);

    // 2) Corrida existente
    const [existingRows] = await sequelize.query(
      `SELECT id, status FROM commission_runs
       WHERE brand_id = :brand_id AND advisor_id = :advisor_id
         AND cut_year = :cut_year AND cut_month = :cut_month AND fortnight = :fortnight
       LIMIT 1`,
      { replacements: { brand_id: brandId, advisor_id: advisorId, cut_year: cutYear, cut_month: cutMonth, fortnight }, transaction: t }
    );

    let runId = existingRows?.[0]?.id || null;
    const existingStatus = existingRows?.[0]?.status;

    if (runId && ["APPROVED", "PAID"].includes(String(existingStatus)))
      throw new HttpError(409, `No se puede recalcular una corrida en estado ${existingStatus}`);

    // 3) Scheme activo
    const [schemeRows] = await sequelize.query(
      `SELECT cs.id, cs.scheme_type
       FROM commission_schemes cs JOIN brands b ON b.id = cs.brand_id
       WHERE b.code = :brand_code AND cs.status = 'ACTIVE'
       ORDER BY cs.id DESC LIMIT 1`,
      { replacements: { brand_code: brandCode }, transaction: t }
    );

    const schemeId   = schemeRows?.[0]?.id || null;
    const schemeType = String(schemeRows?.[0]?.scheme_type || "").toUpperCase();
    if (!schemeId) throw new HttpError(400, "No hay un scheme ACTIVE para esta marca");

    const isRanges = schemeType === "KIA_PLAN";

    // 4) Rango de fechas del mes vencido
    let targetYear  = cutYear;
    let targetMonth = cutMonth - 1;
    if (targetMonth <= 0) { targetMonth = 12; targetYear = cutYear - 1; }

    const from           = new Date(targetYear, targetMonth - 1, 1);
    const nextMonthStart = new Date(targetYear, targetMonth, 1);

    // 5) Ventas del período
    const [salesRows] = await sequelize.query(
      `SELECT s.id as sale_id, s.vehicle_id, v.sale_price
       FROM sales s JOIN vehicles v ON v.id = s.vehicle_id
       WHERE s.brand_id = :brand_id AND s.advisor_id = :advisor_id
         AND s.sale_date >= :from AND s.sale_date < :to
       ORDER BY s.sale_date ASC, s.id ASC`,
      { replacements: { brand_id: brandId, advisor_id: advisorId, from, to: nextMonthStart }, transaction: t }
    );

    const unitsTotal = salesRows?.length || 0;

    // 6) Reglas obligatorias → ¿hay tier forzado?
    let forcedTierName = null;

    const [activeRules] = await sequelize.query(
      `SELECT rule_type, force_tier_name FROM scheme_rules
       WHERE scheme_id = :scheme_id AND is_active = 1`,
      { replacements: { scheme_id: schemeId }, transaction: t }
    );

    for (const rule of activeRules || []) {

      if (rule.rule_type === "VACATION_TIER_OVERRIDE") {
        const [vacRows] = await sequelize.query(
          `SELECT id FROM advisor_vacations
           WHERE advisor_id = :advisor_id AND is_active = 1
             AND start_date <= :cut_end AND end_date >= :cut_start
           LIMIT 1`,
          {
            replacements: {
              advisor_id: advisorId,
              cut_start:  from,
              cut_end:    new Date(targetYear, targetMonth - 1, 31),
            },
            transaction: t,
          }
        );
        if (vacRows?.length > 0) forcedTierName = rule.force_tier_name;
      }

      if (rule.rule_type === "NEW_ADVISOR_TIER_OVERRIDE") {
        const [advisorRows] = await sequelize.query(
          `SELECT hire_date FROM users WHERE id = :advisor_id LIMIT 1`,
          { replacements: { advisor_id: advisorId }, transaction: t }
        );
        const hireDate = advisorRows?.[0]?.hire_date;
        if (hireDate) {
          const cutDate         = new Date(targetYear, targetMonth - 1, 1);
          const threeMonthsBack = new Date(cutDate);
          threeMonthsBack.setMonth(threeMonthsBack.getMonth() - 3);
          if (new Date(hireDate) >= threeMonthsBack) forcedTierName = rule.force_tier_name;
        }
      }
    }

    // 7) Resolver tier (forzado o por unidades)
    let tierId = null;

    if (forcedTierName) {
      const [forcedRows] = await sequelize.query(
        `SELECT id FROM commission_tiers
         WHERE scheme_id = :scheme_id AND tier_name = :tier_name LIMIT 1`,
        { replacements: { scheme_id: schemeId, tier_name: forcedTierName }, transaction: t }
      );
      tierId = forcedRows?.[0]?.id || null;
    } else if (unitsTotal > 0) {
      const [tierRows] = await sequelize.query(
        `SELECT id FROM commission_tiers
         WHERE scheme_id = :scheme_id
           AND min_units <= :units_total
           AND (max_units IS NULL OR max_units >= :units_total)
         ORDER BY priority ASC LIMIT 1`,
        { replacements: { scheme_id: schemeId, units_total: unitsTotal }, transaction: t }
      );
      tierId = tierRows?.[0]?.id || null;
    }

    // 8) Crear o limpiar corrida
    if (!runId) {
      const [ins] = await sequelize.query(
        `INSERT INTO commission_runs
           (brand_id, advisor_id, cut_year, cut_month, fortnight,
            scheme_id, units_total, total_commission, status, notes, created_by, created_at, updated_at)
         VALUES
           (:brand_id, :advisor_id, :cut_year, :cut_month, :fortnight,
            :scheme_id, 0, 0, 'DRAFT', :notes, :created_by, NOW(), NOW())`,
        {
          replacements: {
            brand_id: brandId, advisor_id: advisorId, cut_year: cutYear,
            cut_month: cutMonth, fortnight, scheme_id: schemeId,
            notes: b.notes || null, created_by: req.user?.id || null,
          },
          transaction: t,
        }
      );
      runId = ins?.insertId || null;
      if (!runId) {
        const [lastId] = await sequelize.query(`SELECT LAST_INSERT_ID() as id`, { transaction: t });
        runId = lastId?.[0]?.id || null;
      }
      if (!runId) throw new HttpError(500, "No se pudo crear la corrida");
    } else {
      await sequelize.query(
        `DELETE FROM commission_run_items WHERE run_id = :run_id`,
        { replacements: { run_id: runId }, transaction: t }
      );
    }

    // 9) Calcular items
    let totalCommission = 0;
    const itemNote = forcedTierName ? `Tier forzado por regla: ${forcedTierName}` : null;

    if (isRanges) {
      const rateByVehicleId = new Map();

      if (tierId && unitsTotal > 0) {
        const [rateRows] = await sequelize.query(
          `SELECT v.id as vehicle_id, cvr.amount
           FROM commission_vehicle_rates cvr
           JOIN vehicles v ON v.code = cvr.vehicle_code
           WHERE cvr.scheme_id = :scheme_id AND cvr.tier_id = :tier_id AND v.brand_id = :brand_id`,
          { replacements: { scheme_id: schemeId, tier_id: tierId, brand_id: brandId }, transaction: t }
        );
        for (const r of rateRows || []) rateByVehicleId.set(Number(r.vehicle_id), Number(r.amount));
      }

      for (const s of salesRows || []) {
        const vehicleId = Number(s.vehicle_id);
        const amount    = Number(rateByVehicleId.get(vehicleId) || 0);
        totalCommission += amount;

        await sequelize.query(
          `INSERT INTO commission_run_items
             (run_id, sale_id, vehicle_id, tier_id, rate_amount, notes, created_at, updated_at)
           VALUES (:run_id, :sale_id, :vehicle_id, :tier_id, :rate_amount, :notes, NOW(), NOW())`,
          {
            replacements: {
              run_id: runId, sale_id: s.sale_id, vehicle_id: vehicleId,
              tier_id: tierId, rate_amount: amount,
              notes: tierId == null ? "Tier no encontrado" : amount === 0 ? "Rate no encontrado" : itemNote,
            },
            transaction: t,
          }
        );
      }

    } else {
      let pct = 0;
      if (tierId) {
        const [pctRows] = await sequelize.query(
          `SELECT percentage FROM commission_percentage_tiers
           WHERE scheme_id = :scheme_id AND tier_id = :tier_id LIMIT 1`,
          { replacements: { scheme_id: schemeId, tier_id: tierId }, transaction: t }
        );
        pct = Number(pctRows?.[0]?.percentage || 0);
      }

      for (const s of salesRows || []) {
        const vehicleId = Number(s.vehicle_id);
        const salePrice = Number(s.sale_price || 0);
        const amount    = Number((salePrice * (pct / 100)).toFixed(2));
        totalCommission += amount;

        await sequelize.query(
          `INSERT INTO commission_run_items
             (run_id, sale_id, vehicle_id, tier_id, rate_amount, notes, created_at, updated_at)
           VALUES (:run_id, :sale_id, :vehicle_id, :tier_id, :rate_amount, :notes, NOW(), NOW())`,
          {
            replacements: {
              run_id: runId, sale_id: s.sale_id, vehicle_id: vehicleId,
              tier_id: tierId, rate_amount: amount,
              notes: tierId == null ? "Tier no encontrado"
                : salePrice <= 0 ? "Vehículo sin sale_price"
                : pct <= 0 ? "Porcentaje no configurado"
                : itemNote,
            },
            transaction: t,
          }
        );
      }
    }

    // 10) Bonos opcionales
    let totalBonuses     = 0;
    const appliedBonuses = [];

    const [activeBonuses] = await sequelize.query(
      `SELECT id, name, min_units, bonus_amount FROM scheme_bonuses
       WHERE scheme_id = :scheme_id AND is_active = 1
       ORDER BY min_units ASC`,
      { replacements: { scheme_id: schemeId }, transaction: t }
    );

    for (const bonus of activeBonuses || []) {
      if (unitsTotal >= Number(bonus.min_units)) {
        const amt = Number(bonus.bonus_amount);
        totalBonuses += amt;
        appliedBonuses.push({ name: bonus.name, amount: amt });
      }
    }
    totalCommission += totalBonuses;

    // 11) Update final
    const notesArr = [];
    if (forcedTierName) notesArr.push(`Regla: ${forcedTierName}`);
    if (appliedBonuses.length)
      notesArr.push(`Bonos: ${appliedBonuses.map((bo) => `${bo.name}(+$${bo.amount.toLocaleString("es-CO")})`).join(", ")}`);

    await sequelize.query(
      `UPDATE commission_runs
       SET scheme_id = :scheme_id, units_total = :units_total,
           total_commission = :total_commission, status = 'CALCULATED',
           notes = :notes, updated_at = NOW()
       WHERE id = :run_id`,
      {
        replacements: {
          scheme_id: schemeId, units_total: unitsTotal,
          total_commission: totalCommission,
          notes: notesArr.length ? notesArr.join(" | ") : (b.notes || null),
          run_id: runId,
        },
        transaction: t,
      }
    );

    await t.commit();

    res.json({
      ok: true,
      message: "Corrida calculada",
      data: {
        run_id:           runId,
        units_total:      unitsTotal,
        total_commission: Number(totalCommission.toFixed(2)),
        total_bonuses:    Number(totalBonuses.toFixed(2)),
        applied_bonuses:  appliedBonuses,
        forced_tier:      forcedTierName || null,
        scheme_id:        schemeId,
        tier_id:          tierId,
        scheme_type:      schemeType,
      },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

export async function updateRunStatus(req, res, next) {
  try {
    const p = req.validated?.params || req.params;
    const b = req.validated?.body || req.body;

    const runId     = Number(p.id);
    const status    = String(b.status || "").toUpperCase();
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();

    if (!brandCode) throw new HttpError(400, "Marca requerida");
    if (!["DRAFT", "CALCULATED", "APPROVED", "PAID"].includes(status))
      throw new HttpError(400, "Estado inválido");

    const [rows] = await sequelize.query(
      `SELECT cr.id, cr.status FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       WHERE cr.id = :runId AND b.code = :brandCode LIMIT 1`,
      { replacements: { runId, brandCode } }
    );

    if (!rows?.[0]) throw new HttpError(404, "Corrida no encontrada");

    await sequelize.query(
      `UPDATE commission_runs SET status = :status, updated_at = NOW() WHERE id = :runId`,
      { replacements: { status, runId } }
    );

    res.json({ ok: true, message: "Estado actualizado", data: { id: runId, status } });
  } catch (err) { next(err); }
}