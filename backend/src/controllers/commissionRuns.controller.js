// backend/src/controllers/commissionRuns.controller.js
import { sequelize } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

/**
 * GET /api/commission-runs?brand=KIA&page=1&limit=10&advisor_id=..&cut_year=..&cut_month=..&fortnight=FIRST&status=CALCULATED
 */
export async function listRuns(req, res, next) {
  try {
    const q = req.validated?.query || req.query;

    const brandCode = (req.brand?.code || q.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const page = Number(q.page || 1);
    const limit = Number(q.limit || 10);
    const offset = (page - 1) * limit;

    const replacements = {
      brandCode,
      limit,
      offset,
      advisor_id: q.advisor_id ? Number(q.advisor_id) : null,
      cut_year: q.cut_year ? Number(q.cut_year) : null,
      cut_month: q.cut_month ? Number(q.cut_month) : null,
      fortnight: q.fortnight || null,
      status: q.status || null,
    };

    const where = `
      WHERE b.code = :brandCode
      ${replacements.advisor_id ? " AND cr.advisor_id = :advisor_id " : ""}
      ${replacements.cut_year ? " AND cr.cut_year = :cut_year " : ""}
      ${replacements.cut_month ? " AND cr.cut_month = :cut_month " : ""}
      ${replacements.fortnight ? " AND cr.fortnight = :fortnight " : ""}
      ${replacements.status ? " AND cr.status = :status " : ""}
    `;

    const [countRows] = await sequelize.query(
      `
      SELECT COUNT(*) as total
      FROM commission_runs cr
      JOIN brands b ON b.id = cr.brand_id
      ${where}
      `,
      { replacements }
    );

    const total = Number(countRows?.[0]?.total || 0);

    const [rows] = await sequelize.query(
      `
      SELECT
        cr.*,
        b.code as brand_code,
        b.name as brand_name,
        u.full_name as advisor_name,
        u.email as advisor_email
      FROM commission_runs cr
      JOIN brands b ON b.id = cr.brand_id
      JOIN users u ON u.id = cr.advisor_id
      ${where}
      ORDER BY cr.id DESC
      LIMIT :limit OFFSET :offset
      `,
      { replacements }
    );

    res.json({
      ok: true,
      data: {
        items: rows || [],
        total,
        page,
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/commission-runs/:id?brand=KIA
 */
export async function getRunById(req, res, next) {
  try {
    const p = req.validated?.params || req.params;
    const runId = Number(p.id);

    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    const [runs] = await sequelize.query(
      `
      SELECT
        cr.*,
        b.code as brand_code,
        b.name as brand_name,
        u.full_name as advisor_name,
        u.email as advisor_email
      FROM commission_runs cr
      JOIN brands b ON b.id = cr.brand_id
      JOIN users u ON u.id = cr.advisor_id
      WHERE cr.id = :runId AND b.code = :brandCode
      LIMIT 1
      `,
      { replacements: { runId, brandCode } }
    );

    const run = runs?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    const [items] = await sequelize.query(
      `
      SELECT
        cri.*,
        s.sale_date,
        s.invoice,
        s.client_name,
        s.plate,
        s.cut_month as sale_cut_month,
        s.fortnight as sale_fortnight,
        v.code as vehicle_code,
        v.model as vehicle_model,
        v.version as vehicle_version
      FROM commission_run_items cri
      JOIN sales s ON s.id = cri.sale_id
      JOIN vehicles v ON v.id = cri.vehicle_id
      WHERE cri.run_id = :runId
      ORDER BY cri.id ASC
      `,
      { replacements: { runId } }
    );

    res.json({
      ok: true,
      data: {
        run,
        items: items || [],
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/commission-runs/calculate?brand=KIA
 * body: { advisor_id, cut_year, cut_month, fortnight, notes? }
 *
 * Crea o recalcula una corrida:
 * - toma ventas por brand_id + advisor_id + cut_month + fortnight + YEAR(sale_date)=cut_year
 * - units_total = #ventas
 * - total_commission = SUM(rate_amount)
 * - status => CALCULATED
 */
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

    if (!advisorId || !cutYear || !cutMonth || !fortnight) {
      throw new HttpError(
        400,
        "advisor_id, cut_year, cut_month y fortnight son obligatorios"
      );
    }
    if (!["FIRST", "SECOND"].includes(fortnight)) {
      throw new HttpError(400, "fortnight inválido");
    }

    // 1) Brand id
    const [brandRows] = await sequelize.query(
      `SELECT id FROM brands WHERE code = :brand_code LIMIT 1`,
      { replacements: { brand_code: brandCode }, transaction: t }
    );
    const brandId = brandRows?.[0]?.id;
    if (!brandId) throw new HttpError(400, `Marca no encontrada (${brandCode})`);

    // 2) Buscar corrida existente
    const [existingRows] = await sequelize.query(
      `
      SELECT id, status
      FROM commission_runs
      WHERE brand_id = :brand_id
        AND advisor_id = :advisor_id
        AND cut_year = :cut_year
        AND cut_month = :cut_month
        AND fortnight = :fortnight
      LIMIT 1
      `,
      {
        replacements: {
          brand_id: brandId,
          advisor_id: advisorId,
          cut_year: cutYear,
          cut_month: cutMonth,
          fortnight,
        },
        transaction: t,
      }
    );

    let runId = existingRows?.[0]?.id || null;
    const existingStatus = existingRows?.[0]?.status;

    if (runId && ["APPROVED", "PAID"].includes(String(existingStatus))) {
      throw new HttpError(
        409,
        `No se puede recalcular una corrida en estado ${existingStatus}`
      );
    }

    // 3) Scheme activo (ahorita: el último ACTIVE; luego refinamos por valid_from/valid_to)
    const [schemeRows] = await sequelize.query(
      `
      SELECT cs.id
      FROM commission_schemes cs
      JOIN brands b ON b.id = cs.brand_id
      WHERE b.code = :brand_code
        AND cs.status = 'ACTIVE'
      ORDER BY cs.id DESC
      LIMIT 1
      `,
      { replacements: { brand_code: brandCode }, transaction: t }
    );
    const schemeId = schemeRows?.[0]?.id || null;

    // 4) Ventas del corte
    const [salesRows] = await sequelize.query(
      `
      SELECT s.id as sale_id, s.vehicle_id
      FROM sales s
      WHERE s.brand_id = :brand_id
        AND s.advisor_id = :advisor_id
        AND s.cut_month = :cut_month
        AND s.fortnight = :fortnight
        AND YEAR(s.sale_date) = :cut_year
      ORDER BY s.sale_date ASC, s.id ASC
      `,
      {
        replacements: {
          brand_id: brandId,
          advisor_id: advisorId,
          cut_month: cutMonth,
          fortnight,
          cut_year: cutYear,
        },
        transaction: t,
      }
    );

    const unitsTotal = salesRows?.length || 0;

    // 5) Tier (tabla) según unidades
    let tierId = null;
    if (schemeId) {
      const [tierRows] = await sequelize.query(
        `
        SELECT id
        FROM commission_tiers
        WHERE scheme_id = :scheme_id
          AND min_units <= :units_total
          AND (max_units IS NULL OR max_units >= :units_total)
        ORDER BY priority ASC
        LIMIT 1
        `,
        {
          replacements: { scheme_id: schemeId, units_total: unitsTotal },
          transaction: t,
        }
      );
      tierId = tierRows?.[0]?.id || null;
    }

    // 6) Crear o limpiar corrida
    if (!runId) {
      const [ins] = await sequelize.query(
        `
        INSERT INTO commission_runs
          (brand_id, advisor_id, cut_year, cut_month, fortnight, scheme_id, units_total, total_commission, status, notes, created_by, created_at, updated_at)
        VALUES
          (:brand_id, :advisor_id, :cut_year, :cut_month, :fortnight, :scheme_id, 0, 0, 'DRAFT', :notes, :created_by, NOW(), NOW())
        `,
        {
          replacements: {
            brand_id: brandId,
            advisor_id: advisorId,
            cut_year: cutYear,
            cut_month: cutMonth,
            fortnight,
            scheme_id: schemeId,
            notes: b.notes || null,
            created_by: req.user?.id || null,
          },
          transaction: t,
        }
      );

      runId = ins?.insertId || null;

      // fallback ultra seguro
      if (!runId) {
        const [lastIdRows] = await sequelize.query(`SELECT LAST_INSERT_ID() as id`, {
          transaction: t,
        });
        runId = lastIdRows?.[0]?.id || null;
      }

      if (!runId) throw new HttpError(500, "No se pudo crear la corrida");
    } else {
      await sequelize.query(
        `DELETE FROM commission_run_items WHERE run_id = :run_id`,
        { replacements: { run_id: runId }, transaction: t }
      );
    }

    // 7) Map rates por vehicle_id (para el tier elegido)
    const rateByVehicleId = new Map();

    if (schemeId && tierId && unitsTotal > 0) {
      const [rateRows] = await sequelize.query(
        `
        SELECT v.id as vehicle_id, cvr.amount
        FROM commission_vehicle_rates cvr
        JOIN vehicles v
          ON v.code = cvr.vehicle_code
         AND v.model = cvr.model
         AND v.version = cvr.version
        WHERE cvr.scheme_id = :scheme_id
          AND cvr.tier_id = :tier_id
          AND v.brand_id = :brand_id
        `,
        {
          replacements: {
            scheme_id: schemeId,
            tier_id: tierId,
            brand_id: brandId,
          },
          transaction: t,
        }
      );

      for (const r of rateRows || []) {
        rateByVehicleId.set(Number(r.vehicle_id), Number(r.amount));
      }
    }

    // 8) Insert items
    let totalCommission = 0;

    for (const s of salesRows || []) {
      const vehicleId = Number(s.vehicle_id);
      const amount = Number(rateByVehicleId.get(vehicleId) || 0);

      totalCommission += amount;

      await sequelize.query(
        `
        INSERT INTO commission_run_items
          (run_id, sale_id, vehicle_id, tier_id, rate_amount, notes, created_at, updated_at)
        VALUES
          (:run_id, :sale_id, :vehicle_id, :tier_id, :rate_amount, :notes, NOW(), NOW())
        `,
        {
          replacements: {
            run_id: runId,
            sale_id: s.sale_id,
            vehicle_id: vehicleId,
            tier_id: tierId,
            rate_amount: amount,
            notes: amount === 0 ? "Rate no encontrado para este vehículo/tier" : null,
          },
          transaction: t,
        }
      );
    }

    // 9) Update corrida
    await sequelize.query(
      `
      UPDATE commission_runs
      SET scheme_id = :scheme_id,
          units_total = :units_total,
          total_commission = :total_commission,
          status = 'CALCULATED',
          updated_at = NOW()
      WHERE id = :run_id
      `,
      {
        replacements: {
          scheme_id: schemeId,
          units_total: unitsTotal,
          total_commission: totalCommission,
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
        total_commission: Number(totalCommission.toFixed(2)),
        scheme_id: schemeId,
        tier_id: tierId,
      },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

/**
 * PATCH /api/commission-runs/:id/status?brand=KIA
 * body: { status: "APPROVED" | "PAID" | "DRAFT" | "CALCULATED" }
 */
export async function updateRunStatus(req, res, next) {
  try {
    const p = req.validated?.params || req.params;
    const b = req.validated?.body || req.body;

    const runId = Number(p.id);
    const status = String(b.status || "").toUpperCase();

    const brandCode = (req.brand?.code || req.query.brand || "").toUpperCase();
    if (!brandCode) throw new HttpError(400, "Marca requerida");

    if (!["DRAFT", "CALCULATED", "APPROVED", "PAID"].includes(status)) {
      throw new HttpError(400, "Estado inválido");
    }

    // Validar que pertenezca a la marca
    const [rows] = await sequelize.query(
      `
      SELECT cr.id, cr.status
      FROM commission_runs cr
      JOIN brands b ON b.id = cr.brand_id
      WHERE cr.id = :runId AND b.code = :brandCode
      LIMIT 1
      `,
      { replacements: { runId, brandCode } }
    );

    const run = rows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    await sequelize.query(
      `
      UPDATE commission_runs
      SET status = :status, updated_at = NOW()
      WHERE id = :runId
      `,
      { replacements: { status, runId } }
    );

    res.json({ ok: true, message: "Estado actualizado", data: { id: runId, status } });
  } catch (err) {
    next(err);
  }
}
