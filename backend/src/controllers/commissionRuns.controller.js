import { sequelize } from "../config/db.js";
import { HttpError }  from "../utils/httpError.js";
import { evaluatePolicy } from "../utils/policyEngine.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildEvaluationContext({ advisorId, unitsTotal, salesRows, from, cutEnd, t }) {
  const unitsByVehicle = new Map();
  for (const s of salesRows || []) {
    const vid = Number(s.vehicle_id);
    unitsByVehicle.set(vid, (unitsByVehicle.get(vid) || 0) + 1);
  }

  const [vacRows] = await sequelize.query(
    `SELECT id FROM advisor_vacations
     WHERE advisor_id = :advisor_id AND is_active = 1
       AND start_date <= :cut_end AND end_date >= :cut_start
     LIMIT 1`,
    { replacements: { advisor_id: advisorId, cut_start: from, cut_end: cutEnd }, transaction: t }
  );
  const isOnVacation = (vacRows?.length || 0) > 0;

  const [advisorRows] = await sequelize.query(
    `SELECT hire_date FROM users WHERE id = :advisor_id LIMIT 1`,
    { replacements: { advisor_id: advisorId }, transaction: t }
  );
  const hireDate = advisorRows?.[0]?.hire_date;
  let tenureMonths = null;
  if (hireDate) {
    const hire    = new Date(hireDate);
    const cutDate = new Date(from);
    tenureMonths  = (cutDate.getFullYear() - hire.getFullYear()) * 12 + (cutDate.getMonth() - hire.getMonth());
    if (tenureMonths < 0) tenureMonths = 0;
  }

  return { unitsTotal, unitsByVehicle, isOnVacation, tenureMonths };
}

function parseConditions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
  return [];
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function listRuns(req, res, next) {
  try {
    const q         = req.validated?.query || req.query;
    const brandCode = (req.brand?.code || q.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const page   = Number(q.page  || 1);
    const limit  = Number(q.limit || 10);
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
    const p         = req.validated?.params || req.params;
    const runId     = Number(p.id);
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const [runs] = await sequelize.query(
      `SELECT cr.*,
              b.code as brand_code, b.name as brand_name,
              u.full_name          as advisor_name,
              u.email              as advisor_email,
              u.document_number    as advisor_document,
              u.phone              as advisor_phone,
              u.hire_date          as advisor_hire_date,
              br.name              as advisor_branch,
              adj_user.full_name   as adjustment_by_name
       FROM commission_runs cr
       JOIN brands  b  ON b.id  = cr.brand_id
       JOIN users   u  ON u.id  = cr.advisor_id
       LEFT JOIN branches br       ON br.id = u.branch_id
       LEFT JOIN users adj_user    ON adj_user.id = cr.manual_adjustment_by
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
  let responseData = null; // se llena dentro del try, se usa fuera
  try {
    const b         = req.validated?.body || req.body;
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
      { replacements: { brand_id: brandId, advisor_id: advisorId, cut_year: cutYear, cut_month: cutMonth, fortnight }, transaction: t }
    );
    let runId          = existingRows?.[0]?.id || null;
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
    const schemeId   = schemeRows?.[0]?.id || null;
    const schemeType = String(schemeRows?.[0]?.scheme_type || "").toUpperCase();
    if (!schemeId) throw new HttpError(400, "No hay un scheme ACTIVE para esta marca");

    const isRanges = schemeType === "KIA_PLAN";

    // ── 4) Período del mes vencido ────────────────────────────────────────────
    let targetYear  = cutYear;
    let targetMonth = cutMonth - 1;
    if (targetMonth <= 0) { targetMonth = 12; targetYear = cutYear - 1; }

    const from           = new Date(targetYear, targetMonth - 1, 1);
    const nextMonthStart = new Date(targetYear, targetMonth, 1);
    const cutEnd         = new Date(targetYear, targetMonth - 1, 31);

    // ── 5) Ventas del período ─────────────────────────────────────────────────
    const [salesRows] = await sequelize.query(
      `SELECT s.id as sale_id, s.vehicle_id, s.sale_date, v.sale_price
       FROM sales s JOIN vehicles v ON v.id = s.vehicle_id
       WHERE s.brand_id = :brand_id AND s.advisor_id = :advisor_id
         AND s.sale_date >= :from AND s.sale_date < :to
       ORDER BY s.sale_date ASC, s.id ASC`,
      { replacements: { brand_id: brandId, advisor_id: advisorId, from, to: nextMonthStart }, transaction: t }
    );
    const unitsTotal = salesRows?.length || 0;

    // ── 6) Contexto de evaluación ─────────────────────────────────────────────
    const ctx = await buildEvaluationContext({ advisorId, unitsTotal, salesRows, from, cutEnd, t });

    // ── 7) Reglas activas — solo FORCE_TIER (para vacaciones y antigüedad)
    //    NOTA: Las reglas FIXED_ADD / FIXED_SUBTRACT ya NO se aplican automáticamente.
    //    Si la marca necesita ajustes fijos por política, se hacen via el endpoint
    //    PATCH /commission-runs/:id/adjustment de forma manual.
    const [activeRules] = await sequelize.query(
      `SELECT id, name, conditions, effect_type, effect_value, priority
       FROM scheme_rules
       WHERE scheme_id = :scheme_id AND is_active = 1
       ORDER BY priority DESC, id ASC`,
      { replacements: { scheme_id: schemeId }, transaction: t }
    );

    let forcedTierName = null;
    const appliedRules = [];

    for (const rule of activeRules || []) {
      const conditions    = parseConditions(rule.conditions);
      const isVacRule     = conditions.some((c) => String(c.type || "").toUpperCase() === "ADVISOR_ON_VACATION");
      if (isVacRule) continue; // se procesa por venta

      // Solo procesamos FORCE_TIER en el loop global (FIXED_ADD/SUBTRACT se ignoran)
      if (!["FORCE_TIER"].includes(rule.effect_type)) continue;

      const matches = evaluatePolicy(conditions, ctx);
      if (!matches) continue;

      appliedRules.push(rule.name);
      if (rule.effect_type === "FORCE_TIER" && !forcedTierName) {
        forcedTierName = rule.effect_value;
      }
    }

    // ── 8) Resolver tier BASE por unidades ────────────────────────────────────
    let tierId = null;
    if (forcedTierName) {
      const [forcedRows] = await sequelize.query(
        `SELECT id FROM commission_tiers WHERE scheme_id = :scheme_id AND tier_name = :tier_name LIMIT 1`,
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

    // ── 8b) Tier de vacaciones ────────────────────────────────────────────────
    let vacationTierName = null;
    let vacationTierId   = null;

    if (ctx.isOnVacation) {
      for (const rule of activeRules || []) {
        if (rule.effect_type !== "FORCE_TIER") continue;
        const conditions    = parseConditions(rule.conditions);
        const isVacRule     = conditions.some((c) => String(c.type || "").toUpperCase() === "ADVISOR_ON_VACATION");
        if (!isVacRule) continue;
        const matches = evaluatePolicy(conditions, ctx);
        if (!matches) continue;
        vacationTierName = rule.effect_value;
        break;
      }
      if (vacationTierName) {
        const [vTierRows] = await sequelize.query(
          `SELECT id FROM commission_tiers WHERE scheme_id = :scheme_id AND tier_name = :tier_name LIMIT 1`,
          { replacements: { scheme_id: schemeId, tier_name: vacationTierName }, transaction: t }
        );
        vacationTierId = vTierRows?.[0]?.id || null;
      }
    }

    const [vacationRows] = await sequelize.query(
      `SELECT start_date, end_date FROM advisor_vacations WHERE advisor_id = :advisor_id AND is_active = 1`,
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
            scheme_id, units_total, base_commission, total_commission,
            status, notes, created_by, created_at, updated_at)
         VALUES
           (:brand_id, :advisor_id, :cut_year, :cut_month, :fortnight,
            :scheme_id, 0, 0, 0,
            'DRAFT', :notes, :created_by, NOW(), NOW())`,
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
      // Al recalcular, limpiar también el ajuste manual previo
      await sequelize.query(
        `DELETE FROM commission_run_items WHERE run_id = :run_id`,
        { replacements: { run_id: runId }, transaction: t }
      );
      await sequelize.query(
        `UPDATE commission_runs
         SET manual_adjustment = NULL, manual_adjustment_type = NULL,
             manual_adjustment_note = NULL, manual_adjustment_by = NULL,
             manual_adjustment_at = NULL
         WHERE id = :run_id`,
        { replacements: { run_id: runId }, transaction: t }
      );
    }

    // ── 10) Calcular items ────────────────────────────────────────────────────
    let totalCommission = 0;
    const itemNote      = forcedTierName ? `Tier forzado: ${forcedTierName}` : null;

    if (isRanges) {
      // Pre-cargar rates tier BASE
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

      // Pre-cargar rates tier VACACIONES
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
        const vehicleId    = Number(s.vehicle_id);
        const onVacation   = isOnVacationDate(s.sale_date);
        const effectiveTierId = (onVacation && vacationTierId) ? vacationTierId : tierId;
        const rateMap         = (onVacation && vacationTierId) ? vacRateByVehicleId : rateByVehicleId;
        const amount          = Number(rateMap.get(vehicleId) || 0);
        totalCommission      += amount;

        const noteStr = onVacation && vacationTierId
          ? `Vacaciones: ${vacationTierName}`
          : tierId == null         ? "Tier no encontrado"
          : amount === 0           ? "Rate no encontrado para este vehículo/tier"
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
      // Esquema por porcentaje
      let pct = 0;
      if (tierId) {
        const [pctRows] = await sequelize.query(
          `SELECT percentage FROM commission_percentage_tiers WHERE scheme_id = :scheme_id AND tier_id = :tier_id LIMIT 1`,
          { replacements: { scheme_id: schemeId, tier_id: tierId }, transaction: t }
        );
        pct = Number(pctRows?.[0]?.percentage || 0);
      }

      let vacPct = 0;
      if (vacationTierId) {
        const [vacPctRows] = await sequelize.query(
          `SELECT percentage FROM commission_percentage_tiers WHERE scheme_id = :scheme_id AND tier_id = :tier_id LIMIT 1`,
          { replacements: { scheme_id: schemeId, tier_id: vacationTierId }, transaction: t }
        );
        vacPct = Number(vacPctRows?.[0]?.percentage || 0);
      }

      for (const s of salesRows || []) {
        const vehicleId      = Number(s.vehicle_id);
        const salePrice      = Number(s.sale_price || 0);
        const onVacation     = isOnVacationDate(s.sale_date);
        const effectiveTierId = (onVacation && vacationTierId) ? vacationTierId : tierId;
        const effectivePct    = (onVacation && vacationTierId) ? vacPct : pct;
        const amount          = Number((salePrice * (effectivePct / 100)).toFixed(2));
        totalCommission      += amount;

        const noteStr = onVacation && vacationTierId
          ? `Vacaciones: ${vacationTierName}`
          : tierId == null   ? "Tier no encontrado"
          : salePrice <= 0   ? "Vehículo sin sale_price"
          : pct <= 0         ? "Porcentaje no configurado"
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

    // ── 11) Guardar base_commission y total_commission (iguales al calcular)
    //    No hay ajuste automático. Los bonos y ajustes se hacen manualmente.
    const baseCommission = Math.max(0, totalCommission);

    const notesArr = [];
    if (appliedRules.length) notesArr.push(`Reglas: ${appliedRules.join(", ")}`);
    if (vacationTierName)    notesArr.push(`Vacaciones: ventas en ausencia → ${vacationTierName}`);

    await sequelize.query(
      `UPDATE commission_runs
       SET scheme_id        = :scheme_id,
           units_total      = :units_total,
           base_commission  = :base_commission,
           total_commission = :total_commission,
           status           = 'CALCULATED',
           notes            = :notes,
           updated_at       = NOW()
       WHERE id = :run_id`,
      {
        replacements: {
          scheme_id:        schemeId,
          units_total:      unitsTotal,
          base_commission:  baseCommission,
          total_commission: baseCommission,
          notes:            notesArr.length ? notesArr.join(" | ") : (b.notes || null),
          run_id:           runId,
        },
        transaction: t,
      }
    );

    await t.commit();

    // Guardar resultado ANTES de salir del try para responder después
    responseData = {
      run_id:           runId,
      units_total:      unitsTotal,
      base_commission:  baseCommission,
      total_commission: baseCommission,
      applied_rules:    appliedRules,
      forced_tier:      forcedTierName || null,
      vacation_tier:    vacationTierName || null,
      advisor_context: {
        is_on_vacation: ctx.isOnVacation,
        tenure_months:  ctx.tenureMonths,
      },
      scheme_id:   schemeId,
      tier_id:     tierId,
      scheme_type: schemeType,
    };
  } catch (err) {
    // Proteger rollback: si la transacción ya fue commiteada no lanzar un segundo error
    try { await t.rollback(); } catch { /* ya commiteada, ignorar */ }
    return next(err);
  }

  // Responder FUERA del try/catch — la transacción ya está cerrada aquí
  res.json({ ok: true, message: "Corrida calculada", data: responseData });
}

// ── applyAdjustment ── PATCH /commission-runs/:id/adjustment ─────────────────
// Solo BRAND_OP/ADMIN, solo cuando status = CALCULATED
export async function applyAdjustment(req, res, next) {
  try {
    const runId    = Number(req.params.id);
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();
    const { amount, type, note } = req.body;

    // Validaciones
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount))
      throw new HttpError(400, "amount debe ser un número positivo mayor a 0");

    const parsedType = String(type || "").toUpperCase();
    if (!["ADD", "SUBTRACT"].includes(parsedType))
      throw new HttpError(400, "type debe ser 'ADD' o 'SUBTRACT'");

    const parsedNote = String(note || "").trim();
    if (parsedNote.length < 5)
      throw new HttpError(400, "note es obligatorio y debe tener al menos 5 caracteres");

    // Buscar corrida
    const [rows] = await sequelize.query(
      `SELECT cr.id, cr.status, cr.base_commission
       FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       WHERE cr.id = :runId AND b.code = :brandCode LIMIT 1`,
      { replacements: { runId, brandCode } }
    );
    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    if (String(run.status).toUpperCase() !== "CALCULATED")
      throw new HttpError(400, `Solo se puede ajustar una corrida en estado CALCULATED. Estado actual: ${run.status}`);

    // Calcular nuevo total
    const base  = Number(run.base_commission || 0);
    const total = parsedType === "ADD"
      ? base + parsedAmount
      : Math.max(0, base - parsedAmount);

    await sequelize.query(
      `UPDATE commission_runs
       SET manual_adjustment      = :amount,
           manual_adjustment_type = :type,
           manual_adjustment_note = :note,
           manual_adjustment_by   = :by,
           manual_adjustment_at   = NOW(),
           total_commission       = :total,
           updated_at             = NOW()
       WHERE id = :runId`,
      {
        replacements: {
          amount:  parsedAmount,
          type:    parsedType,
          note:    parsedNote,
          by:      req.user?.id || null,
          total,
          runId,
        },
      }
    );

    res.json({
      ok:      true,
      message: `Ajuste ${parsedType === "ADD" ? "aplicado (+)" : "aplicado (-)"}`,
      data: {
        id:                    runId,
        base_commission:       base,
        manual_adjustment:     parsedAmount,
        manual_adjustment_type: parsedType,
        manual_adjustment_note: parsedNote,
        total_commission:      total,
      },
    });
  } catch (err) { next(err); }
}

// ── removeAdjustment ── DELETE /commission-runs/:id/adjustment ───────────────
// Elimina el ajuste manual y restaura total = base
export async function removeAdjustment(req, res, next) {
  try {
    const runId     = Number(req.params.id);
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const [rows] = await sequelize.query(
      `SELECT cr.id, cr.status, cr.base_commission, cr.manual_adjustment
       FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       WHERE cr.id = :runId AND b.code = :brandCode LIMIT 1`,
      { replacements: { runId, brandCode } }
    );
    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    if (String(run.status).toUpperCase() !== "CALCULATED")
      throw new HttpError(400, `Solo se puede eliminar el ajuste en estado CALCULATED. Estado actual: ${run.status}`);

    if (run.manual_adjustment === null)
      throw new HttpError(400, "Esta corrida no tiene un ajuste manual aplicado");

    const base = Number(run.base_commission || 0);

    await sequelize.query(
      `UPDATE commission_runs
       SET manual_adjustment      = NULL,
           manual_adjustment_type = NULL,
           manual_adjustment_note = NULL,
           manual_adjustment_by   = NULL,
           manual_adjustment_at   = NULL,
           total_commission       = :base,
           updated_at             = NOW()
       WHERE id = :runId`,
      { replacements: { base, runId } }
    );

    res.json({
      ok:      true,
      message: "Ajuste manual eliminado. Comisión restaurada a valor base.",
      data: { id: runId, base_commission: base, total_commission: base, manual_adjustment: null },
    });
  } catch (err) { next(err); }
}

// ── updateRunStatus ───────────────────────────────────────────────────────────
export async function updateRunStatus(req, res, next) {
  try {
    const p      = req.validated?.params || req.params;
    const b      = req.validated?.body   || req.body;
    const runId  = Number(p.id);
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

// ── listMyRuns ────────────────────────────────────────────────────────────────
export async function listMyRuns(req, res, next) {
  try {
    const advisorId = req.user.id;
    const { year, month } = req.query;

    let where = `cr.advisor_id = :advisorId`;
    const replacements = { advisorId };
    if (year)  { where += ` AND cr.cut_year  = :year`;  replacements.year  = Number(year);  }
    if (month) { where += ` AND cr.cut_month = :month`; replacements.month = Number(month); }

    const [runs] = await sequelize.query(
      `SELECT cr.id, cr.cut_year, cr.cut_month, cr.fortnight,
              cr.status, cr.base_commission, cr.total_commission, cr.units_total,
              cr.manual_adjustment, cr.manual_adjustment_type, cr.manual_adjustment_note,
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

// ── advisorApproveRun ─────────────────────────────────────────────────────────
export async function advisorApproveRun(req, res, next) {
  try {
    const runId    = Number(req.params.id);
    const advisorId = req.user.id;

    const [rows] = await sequelize.query(
      `SELECT id, status, advisor_id FROM commission_runs WHERE id = :runId AND advisor_id = :advisorId LIMIT 1`,
      { replacements: { runId, advisorId } }
    );
    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    if (!["CALCULATED", "ADVISOR_REJECTED"].includes(String(run.status).toUpperCase()))
      throw new HttpError(400, `No se puede aprobar desde estado: ${run.status}`);

    await sequelize.query(
      `UPDATE commission_runs SET status = 'ADVISOR_APPROVED', rejection_note = NULL, updated_at = NOW() WHERE id = :runId`,
      { replacements: { runId } }
    );
    res.json({ ok: true, message: "Comisión aprobada", data: { id: runId, status: "ADVISOR_APPROVED" } });
  } catch (err) { next(err); }
}

// ── advisorRejectRun ──────────────────────────────────────────────────────────
export async function advisorRejectRun(req, res, next) {
  try {
    const runId        = Number(req.params.id);
    const advisorId    = req.user.id;
    const rejectionNote = String(req.body?.note || req.body?.rejection_note || "").trim();

    if (!rejectionNote)
      throw new HttpError(400, "Debes indicar el motivo del rechazo (campo: note)");

    const [rows] = await sequelize.query(
      `SELECT id, status, advisor_id FROM commission_runs WHERE id = :runId AND advisor_id = :advisorId LIMIT 1`,
      { replacements: { runId, advisorId } }
    );
    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    if (String(run.status).toUpperCase() !== "CALCULATED")
      throw new HttpError(400, `Solo puedes rechazar en estado CALCULATED. Estado actual: ${run.status}`);

    await sequelize.query(
      `UPDATE commission_runs SET status = 'ADVISOR_REJECTED', rejection_note = :note, updated_at = NOW() WHERE id = :runId`,
      { replacements: { runId, note: rejectionNote } }
    );
    res.json({ ok: true, message: "Comisión rechazada", data: { id: runId, status: "ADVISOR_REJECTED" } });
  } catch (err) { next(err); }
}

// ── asstValidateRun ───────────────────────────────────────────────────────────
export async function asstValidateRun(req, res, next) {
  try {
    const runId     = Number(req.params.id);
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
      throw new HttpError(400, `Solo puedes validar en estado ADVISOR_APPROVED. Estado actual: ${run.status}`);

    await sequelize.query(
      `UPDATE commission_runs SET status = 'ASST_VALIDATED', updated_at = NOW() WHERE id = :runId`,
      { replacements: { runId } }
    );
    res.json({ ok: true, message: "Corrida validada", data: { id: runId, status: "ASST_VALIDATED" } });
  } catch (err) { next(err); }
}

// ── sendToHR ──────────────────────────────────────────────────────────────────
export async function sendToHR(req, res, next) {
  try {
    const runId     = Number(req.params.id);
    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();

    const [rows] = await sequelize.query(
      `SELECT cr.id, cr.status, u.full_name AS advisor_name, u.email AS advisor_email,
              b.name AS brand_name, cr.cut_year, cr.cut_month,
              cr.base_commission, cr.manual_adjustment, cr.manual_adjustment_type,
              cr.manual_adjustment_note, cr.total_commission
       FROM commission_runs cr
       JOIN brands b ON b.id = cr.brand_id
       JOIN users  u ON u.id = cr.advisor_id
       WHERE cr.id = :runId AND b.code = :brandCode LIMIT 1`,
      { replacements: { runId, brandCode } }
    );
    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    if (String(run.status).toUpperCase() !== "ASST_VALIDATED")
      throw new HttpError(400, `Solo puedes enviar en estado ASST_VALIDATED. Estado actual: ${run.status}`);

    await sequelize.query(
      `UPDATE commission_runs SET status = 'SENT_TO_HR', updated_at = NOW() WHERE id = :runId`,
      { replacements: { runId } }
    );

    res.json({
      ok:      true,
      message: "Comisión enviada a Talento Humano",
      data: {
        id:               runId,
        status:           "SENT_TO_HR",
        advisor_name:     run.advisor_name,
        brand_name:       run.brand_name,
        base_commission:  run.base_commission,
        manual_adjustment: run.manual_adjustment,
        total_commission: run.total_commission,
      },
    });
  } catch (err) { next(err); }
}

// ── deleteRun ─────────────────────────────────────────────────────────────────
export async function deleteRun(req, res, next) {
  try {
    const runId     = Number(req.params.id);
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
      throw new HttpError(400, `No se puede eliminar en estado: ${run.status}`);

    await sequelize.query(`DELETE FROM commission_run_items WHERE run_id = :runId`, { replacements: { runId } });
    await sequelize.query(`DELETE FROM commission_runs WHERE id = :runId`,         { replacements: { runId } });

    res.json({ ok: true, message: "Corrida eliminada" });
  } catch (err) { next(err); }
}

// ── getRunByIdAdvisor ─────────────────────────────────────────────────────────
export async function getRunByIdAdvisor(req, res, next) {
  try {
    const runId    = Number(req.params.id);
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