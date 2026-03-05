// backend/src/controllers/dashboard.controller.js
import { sequelize } from "../config/db.js";

export async function getDashboardStats(req, res, next) {
  try {
    const now       = new Date();
    const thisYear  = now.getFullYear();
    const thisMonth = now.getMonth() + 1;

    // Período de comisiones — configurable por ?comm_year=&comm_month=
    // Por defecto: mes anterior
    let defaultPrevMonth = thisMonth - 1;
    let defaultPrevYear  = thisYear;
    if (defaultPrevMonth <= 0) { defaultPrevMonth = 12; defaultPrevYear = thisYear - 1; }

    const prevMonth = Number(req.query.comm_month || defaultPrevMonth);
    const prevYear  = Number(req.query.comm_year  || defaultPrevYear);

    // Período anterior al seleccionado (para comparativo ▲▼)
    let prev2Month = prevMonth - 1;
    let prev2Year  = prevYear;
    if (prev2Month <= 0) { prev2Month = 12; prev2Year = prevYear - 1; }

    // Rango de fechas del período de comisiones
    const nextCommMonth = prevMonth === 12 ? 1        : prevMonth + 1;
    const nextCommYear  = prevMonth === 12 ? prevYear + 1 : prevYear;
    const monthStart  = `${prevYear}-${String(prevMonth).padStart(2,"0")}-01`;
    const monthEnd    = `${nextCommYear}-${String(nextCommMonth).padStart(2,"0")}-01`;
    const month2Start = `${prev2Year}-${String(prev2Month).padStart(2,"0")}-01`;

    // Filtro de ventas opcional desde frontend (?sales_year=&sales_month=)
    const salesYear  = Number(req.query.sales_year  || prevYear);
    const salesMonth = Number(req.query.sales_month || prevMonth);
    const salesStart = `${salesYear}-${String(salesMonth).padStart(2,"0")}-01`;
    const salesEnd   = salesMonth === 12
      ? `${salesYear + 1}-01-01`
      : `${salesYear}-${String(salesMonth + 1).padStart(2,"0")}-01`;

    // ── 1) KPIs + comparativo ─────────────────────────────────────────────────
    const [kpiResult] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM sales
         WHERE sale_date >= :monthStart AND sale_date < :monthEnd
        ) AS sales_this_month,
        (SELECT COUNT(*) FROM commission_runs
         WHERE cut_year = :prevYear AND cut_month = :prevMonth
           AND status IN ('CALCULATED','APPROVED','PAID')
        ) AS commissions_calculated,
        (SELECT COUNT(*) FROM commission_runs
         WHERE cut_year = :prevYear AND cut_month = :prevMonth
           AND status IN ('APPROVED','PAID')
        ) AS commissions_approved,
        (SELECT COALESCE(SUM(total_commission),0) FROM commission_runs
         WHERE cut_year = :prevYear AND cut_month = :prevMonth
           AND status IN ('APPROVED','PAID')
        ) AS total_paid,
        (SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'ADVISOR' AND u.is_active = 1
        ) AS active_advisors,
        (SELECT COUNT(*) FROM commission_runs
         WHERE cut_year = :prevYear AND cut_month = :prevMonth AND status = 'DRAFT'
        ) AS commissions_pending,
        (SELECT COALESCE(AVG(total_commission),0) FROM commission_runs
         WHERE cut_year = :prevYear AND cut_month = :prevMonth
           AND status IN ('CALCULATED','APPROVED','PAID')
        ) AS avg_commission,
        (SELECT COUNT(*) FROM sales
         WHERE sale_date >= :month2Start AND sale_date < :monthStart
        ) AS prev_sales,
        (SELECT COUNT(*) FROM commission_runs
         WHERE cut_year = :prev2Year AND cut_month = :prev2Month
           AND status IN ('CALCULATED','APPROVED','PAID')
        ) AS prev_commissions_calculated,
        (SELECT COALESCE(SUM(total_commission),0) FROM commission_runs
         WHERE cut_year = :prev2Year AND cut_month = :prev2Month
           AND status IN ('APPROVED','PAID')
        ) AS prev_total_paid,
        (SELECT COALESCE(AVG(total_commission),0) FROM commission_runs
         WHERE cut_year = :prev2Year AND cut_month = :prev2Month
           AND status IN ('CALCULATED','APPROVED','PAID')
        ) AS prev_avg_commission
    `, {
      replacements: { monthStart, monthEnd, month2Start, prevYear, prevMonth, prev2Year, prev2Month },
    });
    const kpiRows = kpiResult?.[0] ?? {};

    // ── 2) Trend mensual 6 meses ──────────────────────────────────────────────
    const [monthlyTrend] = await sequelize.query(`
      SELECT
        cr.cut_year, cr.cut_month,
        b.code AS brand_code,
        COUNT(*) AS run_count,
        COALESCE(SUM(cr.total_commission),0) AS total_commission,
        COALESCE(SUM(cr.units_total),0)      AS units_total
      FROM commission_runs cr
      JOIN brands b ON b.id = cr.brand_id
      WHERE cr.status IN ('CALCULATED','APPROVED','PAID')
        AND ((cr.cut_year = :y1 AND cr.cut_month >= :m1) OR (cr.cut_year = :y2 AND cr.cut_month <= :m2))
      GROUP BY cr.cut_year, cr.cut_month, b.id
      ORDER BY cr.cut_year ASC, cr.cut_month ASC
    `, {
      replacements: (() => {
        let m1 = thisMonth - 5, y1 = thisYear;
        if (m1 <= 0) { m1 += 12; y1 -= 1; }
        return { y1, m1, y2: thisYear, m2: thisMonth };
      })(),
    });

    // ── 3) Top 5 asesores ─────────────────────────────────────────────────────
    const [topAdvisors] = await sequelize.query(`
      SELECT u.id, u.full_name, u.email, br.name AS branch_name,
        COUNT(cr.id) AS run_count,
        COALESCE(SUM(cr.total_commission),0) AS total_commission,
        COALESCE(SUM(cr.units_total),0)      AS units_total
      FROM commission_runs cr
      JOIN users u ON u.id = cr.advisor_id
      LEFT JOIN branches br ON br.id = u.branch_id
      WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
        AND cr.status IN ('CALCULATED','APPROVED','PAID')
      GROUP BY u.id
      ORDER BY total_commission DESC
      LIMIT 5
    `, { replacements: { prevYear, prevMonth } });

    // ── 4) Distribución por marca ─────────────────────────────────────────────
    const [byBrand] = await sequelize.query(`
      SELECT b.code, b.name,
        COUNT(cr.id) AS run_count,
        COALESCE(SUM(cr.total_commission),0) AS total_commission,
        COALESCE(SUM(cr.units_total),0)      AS units_total
      FROM commission_runs cr
      JOIN brands b ON b.id = cr.brand_id
      WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
        AND cr.status IN ('CALCULATED','APPROVED','PAID')
      GROUP BY b.id
      ORDER BY total_commission DESC
    `, { replacements: { prevYear, prevMonth } });

    // ── 5) Últimas 5 corridas ─────────────────────────────────────────────────
    const [recentRuns] = await sequelize.query(`
      SELECT cr.id, cr.cut_year, cr.cut_month, cr.fortnight,
        cr.status, cr.total_commission, cr.units_total, cr.updated_at,
        u.full_name AS advisor_name, b.code AS brand_code, b.name AS brand_name
      FROM commission_runs cr
      JOIN users u ON u.id = cr.advisor_id
      JOIN brands b ON b.id = cr.brand_id
      ORDER BY cr.updated_at DESC
      LIMIT 5
    `);

    // ── 6) Asesores SIN comisión calculada en el período ──────────────────────
    const [pendingAdvisors] = await sequelize.query(`
      SELECT u.id, u.full_name, u.email, br.name AS branch_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN branches br ON br.id = u.branch_id
      WHERE r.name = 'ADVISOR' AND u.is_active = 1
        AND u.id NOT IN (
          SELECT advisor_id FROM commission_runs
          WHERE cut_year = :prevYear AND cut_month = :prevMonth
            AND status IN ('CALCULATED','APPROVED','PAID')
        )
      ORDER BY u.full_name ASC
    `, { replacements: { prevYear, prevMonth } });

    // ── 7) Top 5 vehículos por comisión generada ──────────────────────────────
    const [topVehicles] = await sequelize.query(`
      SELECT v.id, v.code, v.model, v.version, v.sale_price,
        COUNT(cri.id)                    AS units_sold,
        COALESCE(SUM(cri.rate_amount),0) AS total_commission
      FROM commission_run_items cri
      JOIN commission_runs cr ON cr.id = cri.run_id
      JOIN vehicles v ON v.id = cri.vehicle_id
      WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
        AND cr.status IN ('CALCULATED','APPROVED','PAID')
      GROUP BY v.id
      ORDER BY total_commission DESC
      LIMIT 5
    `, { replacements: { prevYear, prevMonth } });

    // ── 8) Ventas filtradas por mes ───────────────────────────────────────────
    const [salesSummaryRows] = await sequelize.query(`
      SELECT
        COUNT(*)                         AS total_units,
        COUNT(DISTINCT s.advisor_id)     AS advisors_with_sales,
        COUNT(DISTINCT s.vehicle_id)     AS distinct_vehicles,
        COALESCE(SUM(v.sale_price),0)    AS total_value
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.sale_date >= :salesStart AND s.sale_date < :salesEnd
    `, { replacements: { salesStart, salesEnd } });

    const [salesByAdvisor] = await sequelize.query(`
      SELECT u.id, u.full_name,
        COUNT(s.id)                   AS units,
        COALESCE(SUM(v.sale_price),0) AS total_value
      FROM sales s
      JOIN users    u ON u.id = s.advisor_id
      JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.sale_date >= :salesStart AND s.sale_date < :salesEnd
      GROUP BY u.id
      ORDER BY units DESC
      LIMIT 10
    `, { replacements: { salesStart, salesEnd } });

    const [salesByVehicle] = await sequelize.query(`
      SELECT v.model, v.version,
        COUNT(s.id)                   AS units,
        COALESCE(SUM(v.sale_price),0) AS total_value
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.sale_date >= :salesStart AND s.sale_date < :salesEnd
      GROUP BY v.id
      ORDER BY units DESC
      LIMIT 8
    `, { replacements: { salesStart, salesEnd } });

    // ── 9) Sparkline: total comisiones por mes últimos 6 meses ───────────────
    const [sparkline] = await sequelize.query(`
      SELECT cut_year, cut_month,
        COALESCE(SUM(total_commission),0) AS total,
        COALESCE(SUM(units_total),0)      AS units
      FROM commission_runs
      WHERE status IN ('CALCULATED','APPROVED','PAID')
        AND ((cut_year = :y1 AND cut_month >= :m1) OR (cut_year = :y2 AND cut_month <= :m2))
      GROUP BY cut_year, cut_month
      ORDER BY cut_year ASC, cut_month ASC
    `, {
      replacements: (() => {
        let m1 = thisMonth - 5, y1 = thisYear;
        if (m1 <= 0) { m1 += 12; y1 -= 1; }
        return { y1, m1, y2: thisYear, m2: thisMonth };
      })(),
    });

    res.json({
      ok: true,
      data: {
        period:         { year: prevYear, month: prevMonth },
        salesPeriod:    { year: salesYear, month: salesMonth },
        kpis:           kpiRows,
        monthlyTrend,
        topAdvisors,
        byBrand,
        recentRuns,
        pendingAdvisors,
        topVehicles,
        salesSummary:   salesSummaryRows?.[0] ?? {},
        salesByAdvisor,
        salesByVehicle,
        sparkline,
      },
    });
  } catch (err) { next(err); }
}