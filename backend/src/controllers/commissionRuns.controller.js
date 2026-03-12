import { sequelize } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";
import { evaluatePolicy } from "../utils/policyEngine.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construye el contexto necesario para evaluar condiciones.
 * Hace las queries de vacaciones y hire_date una sola vez.
 */
async function buildEvaluationContext({ advisorId, unitsTotal, salesRows, from, cutEnd, t }) {
  // Unidades por vehículo (para condiciones MIN_UNITS_OF_VEHICLE / EXACT_UNITS_OF_VEHICLE)
  const unitsByVehicle = new Map();
  for (const s of salesRows || []) {
    const vid = Number(s.vehicle_id);
    unitsByVehicle.set(vid, (unitsByVehicle.get(vid) || 0) + 1);
  }

  // Vacaciones activas que se cruzan con el período
  const [vacRows] = await sequelize.query(
    `SELECT id FROM advisor_vacations
     WHERE advisor_id = :advisor_id AND is_active = 1
       AND start_date <= :cut_end AND end_date >= :cut_start
     LIMIT 1`,
    { replacements: { advisor_id: advisorId, cut_start: from, cut_end: cutEnd }, transaction: t }
  );
  const isOnVacation = (vacRows?.length || 0) > 0;

  // Antigüedad en meses respecto al inicio del período
  const [advisorRows] = await sequelize.query(
    `SELECT hire_date FROM users WHERE id = :advisor_id LIMIT 1`,
    { replacements: { advisor_id: advisorId }, transaction: t }
  );
  const hireDate = advisorRows?.[0]?.hire_date;
  let tenureMonths = null;
  if (hireDate) {
    const hire = new Date(hireDate);
    const cutDate = new Date(from);
    tenureMonths =
      (cutDate.getFullYear() - hire.getFullYear()) * 12 +
      (cutDate.getMonth() - hire.getMonth());
    if (tenureMonths < 0) tenureMonths = 0;
  }

  return { unitsTotal, unitsByVehicle, isOnVacation, tenureMonths };
}

/**
 * Parsea conditions de BD (puede venir como string JSON o array).
 */
function parseConditions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

// ─── Controllers ──────────────────────────────────────────────────────────────

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
      cut_year: q.cut_year ? Number(q.cut_year) : null,
      cut_month: q.cut_month ? Number(q.cut_month) : null,
      fortnight: q.fortnight || null,
      status: q.status || null,
    };

    const where = `
      WHERE b.code = :brandCode
      ${replacements.advisor_id ? " AND cr.advisor_id = :advisor_id " : ""}
      ${replacements.cut_year ? " AND cr.cut_year   = :cut_year   " : ""}
      ${replacements.cut_month ? " AND cr.cut_month  = :cut_month  " : ""}
      ${replacements.fortnight ? " AND cr.fortnight  = :fortnight  " : ""}
      ${replacements.status ? " AND cr.status     = :status     " : ""}
    `;

    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) as total FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id ${where}`,
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
              u.full_name  as advisor_name,
              u.email      as advisor_email,
              u.document_number as advisor_document,
              u.phone      as advisor_phone,
              u.hire_date  as advisor_hire_date,
              br.name      as advisor_branch
       FROM commission_runs cr
       JOIN brands  b  ON b.id  = cr.brand_id
       JOIN users   u  ON u.id  = cr.advisor_id
       LEFT JOIN branches br ON br.id = u.branch_id
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
    const cutYear = Number(b.cut_year);
    const cutMonth = Number(b.cut_month);
    const fortnight = String(b.fortnight || "").toUpperCase();

    if (!advisorId || !cutYear || !cutMonth || !fortnight)
      throw new HttpError(400, "advisor_id, cut_year, cut_month y fortnight son obligatorios");
    if (!["FIRST", "SECOND"].includes(fortnight))
      throw new HttpError(400, "fortnight inválido");

    // ── 1) Brand ──────────────────────────────────────────────────────────────
    const [brandRows] = await sequelize.query(
      `SELECT id FROM brands WHERE code = :brand_code LIMIT 1`,
      { replacements: { brand_code: brandCode }, transaction: t }
    );
    const brandId = brandRows?.[0]?.id;
    if (!brandId) throw new HttpError(400, `Marca no encontrada (${brandCode})`);

    // ── 2) Corrida existente ──────────────────────────────────────────────────
    const [existingRows] = await sequelize.query(
      `SELECT id, status FROM commission_runs
       WHERE brand_id = :brand_id AND advisor_id = :advisor_id
         AND cut_year = :cut_year AND cut_month = :cut_month AND fortnight = :fortnight
       LIMIT 1`,
      {
        replacements: { brand_id: brandId, advisor_id: advisorId, cut_year: cutYear, cut_month: cutMonth, fortnight },
        transaction: t,
      }
    );

    let runId = existingRows?.[0]?.id || null;
    const existingStatus = existingRows?.[0]?.status;

    if (runId && ["APPROVED", "PAID"].includes(String(existingStatus)))
      throw new HttpError(409, `No se puede recalcular una corrida en estado ${existingStatus}`);

    // ── 3) Scheme activo ──────────────────────────────────────────────────────
    const [schemeRows] = await sequelize.query(
      `SELECT cs.id, cs.scheme_type
       FROM commission_schemes cs JOIN brands b ON b.id = cs.brand_id
       WHERE b.code = :brand_code AND cs.status = 'ACTIVE'
       ORDER BY cs.id DESC LIMIT 1`,
      { replacements: { brand_code: brandCode }, transaction: t }
    );

    const schemeId = schemeRows?.[0]?.id || null;
    const schemeType = String(schemeRows?.[0]?.scheme_type || "").toUpperCase();
    if (!schemeId) throw new HttpError(400, "No hay un scheme ACTIVE para esta marca");

    const isRanges = schemeType === "KIA_PLAN";

    // ── 4) Período del mes vencido ────────────────────────────────────────────
    let targetYear = cutYear;
    let targetMonth = cutMonth - 1;
    if (targetMonth <= 0) { targetMonth = 12; targetYear = cutYear - 1; }

    const from = new Date(targetYear, targetMonth - 1, 1);
    const nextMonthStart = new Date(targetYear, targetMonth, 1);
    const cutEnd = new Date(targetYear, targetMonth - 1, 31);

    // ── 5) Ventas del período — incluye sale_date para cruce con vacaciones ───
    const [salesRows] = await sequelize.query(
      `SELECT s.id as sale_id, s.vehicle_id, s.sale_date, v.sale_price
       FROM sales s JOIN vehicles v ON v.id = s.vehicle_id
       WHERE s.brand_id = :brand_id AND s.advisor_id = :advisor_id
         AND s.sale_date >= :from AND s.sale_date < :to
       ORDER BY s.sale_date ASC, s.id ASC`,
      { replacements: { brand_id: brandId, advisor_id: advisorId, from, to: nextMonthStart }, transaction: t }
    );

    const unitsTotal = salesRows?.length || 0;

    // ── 6) Construir contexto de evaluación ───────────────────────────────────
    const ctx = await buildEvaluationContext({
      advisorId, unitsTotal, salesRows, from, cutEnd, t,
    });

    // ── 7) Leer reglas activas ────────────────────────────────────────────────
    const [activeRules] = await sequelize.query(
      `SELECT id, name, conditions, effect_type, effect_value, priority
       FROM scheme_rules
       WHERE scheme_id = :scheme_id AND is_active = 1
       ORDER BY priority DESC, id ASC`,
      { replacements: { scheme_id: schemeId }, transaction: t }
    );

    let forcedTierName = null; // tier global (ej: Antigüedad)
    let fixedAdjustment = 0;
    const appliedRules = [];

    for (const rule of activeRules || []) {
      const conditions = parseConditions(rule.conditions);

      // ── CLAVE: las reglas IS_ON_VACATION se manejan por venta, no globalmente
      const isVacationRule = conditions.some(
        (c) => String(c.type || "").toUpperCase() === "ADVISOR_ON_VACATION"
      );
      if (isVacationRule) continue; // se procesará en el bucle por venta

      const matches = evaluatePolicy(conditions, ctx);
      if (!matches) continue;

      appliedRules.push(rule.name);

      if (rule.effect_type === "FORCE_TIER") {
        if (!forcedTierName) forcedTierName = rule.effect_value;
      } else if (rule.effect_type === "FIXED_ADD") {
        fixedAdjustment += Number(rule.effect_value || 0);
      } else if (rule.effect_type === "FIXED_SUBTRACT") {
        fixedAdjustment -= Number(rule.effect_value || 0);
      }
    }

    // ── 8) Resolver tier BASE por unidades del mes ────────────────────────────
    // Este tier aplica a ventas normales (fuera de vacaciones)
    // Si otra regla global lo fuerza (ej: Antigüedad), ese tier gana
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

    // ── 8b) Resolver tier de VACACIONES ──────────────────────────────────────
    // Solo aplica venta a venta cuando sale_date cae dentro del rango
    let vacationTierName = null;
    let vacationTierId = null;

    // ── 8b) Resolver tier de VACACIONES ──────────────────────────────────────
    // El tipo correcto es ADVISOR_ON_VACATION (campo "type", no "field")
    if (ctx.isOnVacation) {
      for (const rule of activeRules || []) {
        if (rule.effect_type !== "FORCE_TIER") continue;
        const conditions = parseConditions(rule.conditions);

        // Buscar por c.type === "ADVISOR_ON_VACATION"
        const isVacationRule = conditions.some(
          (c) => String(c.type || "").toUpperCase() === "ADVISOR_ON_VACATION"
        );
        if (!isVacationRule) continue;

        // Verificar que todas las condiciones se cumplan
        const matches = evaluatePolicy(conditions, ctx);
        if (!matches) continue;

        vacationTierName = rule.effect_value;
        break;
      }

      if (vacationTierName) {
        const [vTierRows] = await sequelize.query(
          `SELECT id FROM commission_tiers
       WHERE scheme_id = :scheme_id AND tier_name = :tier_name LIMIT 1`,
          { replacements: { scheme_id: schemeId, tier_name: vacationTierName }, transaction: t }
        );
        vacationTierId = vTierRows?.[0]?.id || null;
      }
    }

    // Helper: true si sale_date cae en algún rango de vacaciones activo
    const [vacationRows] = await sequelize.query(
      `SELECT start_date, end_date FROM advisor_vacations
       WHERE advisor_id = :advisor_id AND is_active = 1`,
      { replacements: { advisor_id: advisorId }, transaction: t }
    );

    const isOnVacationDate = (saleDate) => {
      if (!vacationRows?.length || !vacationTierId) return false;
      const d = new Date(saleDate).toISOString().split("T")[0];
      return vacationRows.some((v) => d >= v.start_date && d <= v.end_date);
    };

    // ── 9) Crear o limpiar corrida ────────────────────────────────────────────
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

    // ── 10) Calcular items por modalidad ──────────────────────────────────────
    let totalCommission = 0;
    const itemNote = forcedTierName ? `Tier forzado: ${forcedTierName}` : null;

    if (isRanges) {
      // Pre-cargar rates del tier BASE
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

      // Pre-cargar rates del tier de VACACIONES
      const vacRateByVehicleId = new Map();
      if (vacationTierId) {
        const [vacRateRows] = await sequelize.query(
          `SELECT v.id as vehicle_id, cvr.amount
           FROM commission_vehicle_rates cvr
           JOIN vehicles v ON v.code = cvr.vehicle_code
           WHERE cvr.scheme_id = :scheme_id AND cvr.tier_id = :tier_id AND v.brand_id = :brand_id`,
          { replacements: { scheme_id: schemeId, tier_id: vacationTierId, brand_id: brandId }, transaction: t }
        );
        for (const r of vacRateRows || []) vacRateByVehicleId.set(Number(r.vehicle_id), Number(r.amount));
      }

      for (const s of salesRows || []) {
        const vehicleId = Number(s.vehicle_id);
        const onVacation = isOnVacationDate(s.sale_date);

        // Solo usa tier vacaciones si la venta cae exactamente en el rango
        const effectiveTierId = (onVacation && vacationTierId) ? vacationTierId : tierId;
        const rateMap = (onVacation && vacationTierId) ? vacRateByVehicleId : rateByVehicleId;
        const amount = Number(rateMap.get(vehicleId) || 0);

        totalCommission += amount;

        const noteStr = onVacation && vacationTierId
          ? `Vacaciones: ${vacationTierName}`
          : tierId == null ? "Tier no encontrado"
            : amount === 0 ? "Rate no encontrado para este vehículo/tier"
              : itemNote;

        await sequelize.query(
          `INSERT INTO commission_run_items
             (run_id, sale_id, vehicle_id, tier_id, rate_amount, notes, created_at, updated_at)
           VALUES (:run_id, :sale_id, :vehicle_id, :tier_id, :rate_amount, :notes, NOW(), NOW())`,
          {
            replacements: {
              run_id: runId, sale_id: s.sale_id, vehicle_id: vehicleId,
              tier_id: effectiveTierId, rate_amount: amount, notes: noteStr,
            },
            transaction: t,
          }
        );
      }

    } else {
      // Pre-cargar porcentaje tier BASE
      let pct = 0;
      if (tierId) {
        const [pctRows] = await sequelize.query(
          `SELECT percentage FROM commission_percentage_tiers
           WHERE scheme_id = :scheme_id AND tier_id = :tier_id LIMIT 1`,
          { replacements: { scheme_id: schemeId, tier_id: tierId }, transaction: t }
        );
        pct = Number(pctRows?.[0]?.percentage || 0);
      }

      // Pre-cargar porcentaje tier VACACIONES
      let vacPct = 0;
      if (vacationTierId) {
        const [vacPctRows] = await sequelize.query(
          `SELECT percentage FROM commission_percentage_tiers
           WHERE scheme_id = :scheme_id AND tier_id = :tier_id LIMIT 1`,
          { replacements: { scheme_id: schemeId, tier_id: vacationTierId }, transaction: t }
        );
        vacPct = Number(vacPctRows?.[0]?.percentage || 0);
      }

      for (const s of salesRows || []) {
        const vehicleId = Number(s.vehicle_id);
        const salePrice = Number(s.sale_price || 0);
        const onVacation = isOnVacationDate(s.sale_date);

        const effectiveTierId = (onVacation && vacationTierId) ? vacationTierId : tierId;
        const effectivePct = (onVacation && vacationTierId) ? vacPct : pct;
        const amount = Number((salePrice * (effectivePct / 100)).toFixed(2));

        totalCommission += amount;

        const noteStr = onVacation && vacationTierId
          ? `Vacaciones: ${vacationTierName}`
          : tierId == null ? "Tier no encontrado"
            : salePrice <= 0 ? "Vehículo sin sale_price"
              : pct <= 0 ? "Porcentaje no configurado para este tier"
                : itemNote;

        await sequelize.query(
          `INSERT INTO commission_run_items
             (run_id, sale_id, vehicle_id, tier_id, rate_amount, notes, created_at, updated_at)
           VALUES (:run_id, :sale_id, :vehicle_id, :tier_id, :rate_amount, :notes, NOW(), NOW())`,
          {
            replacements: {
              run_id: runId, sale_id: s.sale_id, vehicle_id: vehicleId,
              tier_id: effectiveTierId, rate_amount: amount, notes: noteStr,
            },
            transaction: t,
          }
        );
      }
    }

    // ── 11) Ajuste fijo de reglas ─────────────────────────────────────────────
    totalCommission += fixedAdjustment;

    // ── 12) Bonos con policyEngine ────────────────────────────────────────────
    const [activeBonuses] = await sequelize.query(
      `SELECT id, name, conditions, bonus_amount
       FROM scheme_bonuses
       WHERE scheme_id = :scheme_id AND is_active = 1
       ORDER BY priority DESC, id ASC`,
      { replacements: { scheme_id: schemeId }, transaction: t }
    );

    let totalBonuses = 0;
    const appliedBonuses = [];

    for (const bonus of activeBonuses || []) {
      const conditions = parseConditions(bonus.conditions);
      const matches = evaluatePolicy(conditions, ctx);
      if (!matches) continue;
      const amt = Number(bonus.bonus_amount || 0);
      totalBonuses += amt;
      appliedBonuses.push({ name: bonus.name, amount: amt });
    }

    totalCommission += totalBonuses;

    // ── 13) Update final ──────────────────────────────────────────────────────
    const notesArr = [];
    if (appliedRules.length)
      notesArr.push(`Reglas: ${appliedRules.join(", ")}`);
    if (fixedAdjustment !== 0)
      notesArr.push(`Ajuste reglas: ${fixedAdjustment > 0 ? "+" : ""}$${fixedAdjustment.toLocaleString("es-CO")}`);
    if (appliedBonuses.length)
      notesArr.push(`Bonos: ${appliedBonuses.map((bo) => `${bo.name}(+$${bo.amount.toLocaleString("es-CO")})`).join(", ")}`);
    if (vacationTierName)
      notesArr.push(`Vacaciones: ventas en ausencia → ${vacationTierName}`);

    await sequelize.query(
      `UPDATE commission_runs
       SET scheme_id        = :scheme_id,
           units_total      = :units_total,
           total_commission = :total_commission,
           status           = 'CALCULATED',
           notes            = :notes,
           updated_at       = NOW()
       WHERE id = :run_id`,
      {
        replacements: {
          scheme_id: schemeId,
          units_total: unitsTotal,
          total_commission: Math.max(0, totalCommission),
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
        run_id: runId,
        units_total: unitsTotal,
        total_commission: Number(Math.max(0, totalCommission).toFixed(2)),
        total_bonuses: Number(totalBonuses.toFixed(2)),
        fixed_adjustment: fixedAdjustment,
        applied_rules: appliedRules,
        applied_bonuses: appliedBonuses,
        forced_tier: forcedTierName || null,
        vacation_tier: vacationTierName || null,
        advisor_context: {
          is_on_vacation: ctx.isOnVacation,
          tenure_months: ctx.tenureMonths,
        },
        scheme_id: schemeId,
        tier_id: tierId,
        scheme_type: schemeType,
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
    const runId = Number(p.id);
    const status = String(b.status || "").toUpperCase();

    const VALID = ["DRAFT", "CALCULATED", "ADVISOR_APPROVED", "ADVISOR_REJECTED", "ASST_VALIDATED", "SENT_TO_HR"];
    if (!VALID.includes(status))
      throw new HttpError(400, `Estado inválido. Valores: ${VALID.join(", ")}`);

    const [rows] = await sequelize.query(
      `SELECT id, status FROM commission_runs WHERE id = :runId LIMIT 1`,
      { replacements: { runId } }
    );
    if (!rows?.[0]) throw new HttpError(404, "Corrida no encontrada");

    await sequelize.query(
      `UPDATE commission_runs SET status = :status, updated_at = NOW() WHERE id = :runId`,
      { replacements: { status, runId } }
    );
    res.json({ ok: true, message: "Estado actualizado", data: { id: runId, status } });
  } catch (err) { next(err); }
}

// ── listMyRuns — asesor ve sus propias corridas ───────────────────────────
export async function listMyRuns(req, res, next) {
  try {
    const advisorId = req.user.id;
    const { year, month } = req.query;

    let where = `cr.advisor_id = :advisorId`;
    const replacements = { advisorId };

    if (year) { where += ` AND cr.cut_year  = :year`; replacements.year = Number(year); }
    if (month) { where += ` AND cr.cut_month = :month`; replacements.month = Number(month); }

    const [runs] = await sequelize.query(
      `SELECT
         cr.id, cr.cut_year, cr.cut_month, cr.fortnight,
         cr.status, cr.total_commission, cr.units_total,
         cr.rejection_note, cr.notes, cr.updated_at,
         b.code AS brand_code, b.name AS brand_name
       FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       WHERE ${where}
       ORDER BY cr.cut_year DESC, cr.cut_month DESC, cr.fortnight DESC`,
      { replacements }
    );

    res.json({ ok: true, data: { items: runs, total: runs.length } });
  } catch (err) { next(err); }
}

// ── advisorApproveRun — asesor aprueba su corrida ─────────────────────────
export async function advisorApproveRun(req, res, next) {
  try {
    const runId = Number(req.params.id);
    const advisorId = req.user.id;

    const [rows] = await sequelize.query(
      `SELECT id, status, advisor_id FROM commission_runs
       WHERE id = :runId AND advisor_id = :advisorId LIMIT 1`,
      { replacements: { runId, advisorId } }
    );

    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    // Solo puede aprobar si está en CALCULATED o ADVISOR_REJECTED
    if (!["CALCULATED", "ADVISOR_REJECTED"].includes(String(run.status).toUpperCase()))
      throw new HttpError(400, `No se puede aprobar desde estado: ${run.status}`);

    await sequelize.query(
      `UPDATE commission_runs
       SET status = 'ADVISOR_APPROVED', rejection_note = NULL, updated_at = NOW()
       WHERE id = :runId`,
      { replacements: { runId } }
    );

    res.json({ ok: true, message: "Comisión aprobada", data: { id: runId, status: "ADVISOR_APPROVED" } });
  } catch (err) { next(err); }
}

// ── advisorRejectRun — asesor rechaza su corrida ──────────────────────────
export async function advisorRejectRun(req, res, next) {
  try {
    const runId = Number(req.params.id);
    const advisorId = req.user.id;
    const rejectionNote = String(req.body?.note || req.body?.rejection_note || "").trim();

    if (!rejectionNote)
      throw new HttpError(400, "Debes indicar el motivo del rechazo (campo: note)");

    const [rows] = await sequelize.query(
      `SELECT id, status, advisor_id FROM commission_runs
       WHERE id = :runId AND advisor_id = :advisorId LIMIT 1`,
      { replacements: { runId, advisorId } }
    );

    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    if (String(run.status).toUpperCase() !== "CALCULATED")
      throw new HttpError(400, `Solo puedes rechazar una corrida en estado CALCULATED. Estado actual: ${run.status}`);

    await sequelize.query(
      `UPDATE commission_runs
       SET status = 'ADVISOR_REJECTED', rejection_note = :note, updated_at = NOW()
       WHERE id = :runId`,
      { replacements: { runId, note: rejectionNote } }
    );

    res.json({ ok: true, message: "Comisión rechazada", data: { id: runId, status: "ADVISOR_REJECTED" } });
  } catch (err) { next(err); }
}

// ── asstValidateRun — BrandOp valida tras aprobación del asesor ──────────
export async function asstValidateRun(req, res, next) {
  try {
    const runId = Number(req.params.id);
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();

    const [rows] = await sequelize.query(
      `SELECT cr.id, cr.status FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       WHERE cr.id = :runId AND b.code = :brandCode LIMIT 1`,
      { replacements: { runId, brandCode } }
    );

    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    if (String(run.status).toUpperCase() !== "ADVISOR_APPROVED")
      throw new HttpError(400, `Solo puedes validar corridas en estado ADVISOR_APPROVED. Estado actual: ${run.status}`);

    await sequelize.query(
      `UPDATE commission_runs SET status = 'ASST_VALIDATED', updated_at = NOW() WHERE id = :runId`,
      { replacements: { runId } }
    );

    res.json({ ok: true, message: "Corrida validada", data: { id: runId, status: "ASST_VALIDATED" } });
  } catch (err) { next(err); }
}

// ── sendToHR — envía a Talento Humano y cierra el flujo ──────────────────
// (por ahora marca como SENT_TO_HR; la integración de email va en Bloque 2)
export async function sendToHR(req, res, next) {
  try {
    const runId = Number(req.params.id);
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();

    const [rows] = await sequelize.query(
      `SELECT cr.id, cr.status, u.full_name AS advisor_name, u.email AS advisor_email,
              b.name AS brand_name, cr.cut_year, cr.cut_month, cr.total_commission
       FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       JOIN users  u ON u.id = cr.advisor_id
       WHERE cr.id = :runId AND b.code = :brandCode LIMIT 1`,
      { replacements: { runId, brandCode } }
    );

    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    if (String(run.status).toUpperCase() !== "ASST_VALIDATED")
      throw new HttpError(400, `Solo puedes enviar corridas en estado ASST_VALIDATED. Estado actual: ${run.status}`);

    await sequelize.query(
      `UPDATE commission_runs SET status = 'SENT_TO_HR', updated_at = NOW() WHERE id = :runId`,
      { replacements: { runId } }
    );

    // TODO Bloque 2: aquí se dispara el envío de PDF por email a Talento Humano

    res.json({
      ok: true,
      message: "Comisión enviada a Talento Humano",
      data: {
        id: runId,
        status: "SENT_TO_HR",
        advisor_name: run.advisor_name,
        brand_name: run.brand_name,
        total_commission: run.total_commission,
      },
    });
  } catch (err) { next(err); }
}

// ── deleteRun — eliminar corrida (solo DRAFT o CALCULATED) ────────────────
export async function deleteRun(req, res, next) {
  try {
    const runId = Number(req.params.id);
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();

    const [rows] = await sequelize.query(
      `SELECT cr.id, cr.status FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       WHERE cr.id = :runId AND b.code = :brandCode LIMIT 1`,
      { replacements: { runId, brandCode } }
    );

    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    const st = String(run.status).toUpperCase();
    if (!["DRAFT", "CALCULATED"].includes(st))
      throw new HttpError(400, `No se puede eliminar una corrida en estado: ${run.status}`);

    await sequelize.query(
      `DELETE FROM commission_run_items WHERE run_id = :runId`,
      { replacements: { runId } }
    );
    await sequelize.query(
      `DELETE FROM commission_runs WHERE id = :runId`,
      { replacements: { runId } }
    );

    res.json({ ok: true, message: "Corrida eliminada" });
  } catch (err) { next(err); }
}

export async function getRunByIdAdvisor(req, res, next) {
  try {
    const runId = Number(req.params.id);
    const advisorId = req.user.id;

    if (!runId) throw new HttpError(400, "ID de corrida inválido");

    const [runs] = await sequelize.query(
      `SELECT cr.*, cr.rejection_note,
              b.code  AS brand_code,  b.name AS brand_name,
              u.full_name        AS advisor_name,
              u.email            AS advisor_email,
              u.document_number  AS advisor_document,
              u.phone            AS advisor_phone,
              u.hire_date        AS advisor_hire_date
       FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       JOIN users  u ON u.id = cr.advisor_id
       WHERE cr.id = :runId AND cr.advisor_id = :advisorId
       LIMIT 1`,
      { replacements: { runId, advisorId } }
    );

    const run = runs?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    const [items] = await sequelize.query(
      `SELECT cri.*,
              s.sale_date, s.invoice, s.client_name, s.plate,
              s.cut_month AS sale_cut_month, s.fortnight AS sale_fortnight,
              v.code    AS vehicle_code,
              v.model   AS vehicle_model,
              v.version AS vehicle_version
       FROM commission_run_items cri
       JOIN sales    s ON s.id = cri.sale_id
       JOIN vehicles v ON v.id = cri.vehicle_id
       WHERE cri.run_id = :runId
       ORDER BY cri.id ASC`,
      { replacements: { runId } }
    );

    res.json({ ok: true, data: { run, items: items || [] } });
  } catch (err) { next(err); }
}
