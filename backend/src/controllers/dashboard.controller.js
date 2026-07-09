// backend/src/controllers/dashboard.controller.js
import { sequelize } from "../config/db.js";

const BRAND_OP_ROLES = ["ASSISTANT_SALES", "BRAND_MANAGER"];

export async function getDashboardStats(req, res, next) {
  try {
    const now       = new Date();
    const thisYear  = now.getFullYear();
    const thisMonth = now.getMonth() + 1;

    const role      = String(req.user?.role || "").toUpperCase();
    const isBrandOp = BRAND_OP_ROLES.includes(role);

    // Si es brandOp → obtener su primer brand_id desde user_brand_access (con paramétrico)
    let forcedBrandId = 0; // 0 = sin filtro (ADMIN ve todo)
    if (isBrandOp) {
      const [brandRows] = await sequelize.query(
        `SELECT uba.brand_id FROM user_brand_access uba
         WHERE uba.user_id = :userId ORDER BY uba.brand_id ASC LIMIT 1`,
        { replacements: { userId: req.user.id } }
      );
      forcedBrandId = Number(brandRows?.[0]?.brand_id ?? 0);
    }

    // ── SEGURO: nunca se concatena forcedBrandId en el SQL.
    // Patrón: (:bid = 0 OR col = :bid) → cortocircuito cuando bid=0 (admin)
    // Todos los replacements reciben { bid: forcedBrandId } junto a los demás params.

    // Períodos
    let defaultPrevMonth = thisMonth - 1;
    let defaultPrevYear  = thisYear;
    if (defaultPrevMonth <= 0) { defaultPrevMonth = 12; defaultPrevYear = thisYear - 1; }

    const prevMonth = Number(req.query.comm_month || defaultPrevMonth);
    const prevYear  = Number(req.query.comm_year  || defaultPrevYear);

    // Validar rangos de fecha del query
    if (prevMonth < 1 || prevMonth > 12 || prevYear < 2000 || prevYear > 2100) {
      return res.status(400).json({ message: "Período de comisión inválido" });
    }

    let prev2Month = prevMonth - 1;
    let prev2Year  = prevYear;
    if (prev2Month <= 0) { prev2Month = 12; prev2Year = prevYear - 1; }

    const nextCommMonth = prevMonth === 12 ? 1        : prevMonth + 1;
    const nextCommYear  = prevMonth === 12 ? prevYear + 1 : prevYear;
    const monthStart  = `${prevYear}-${String(prevMonth).padStart(2,"0")}-01`;
    const monthEnd    = `${nextCommYear}-${String(nextCommMonth).padStart(2,"0")}-01`;
    const month2Start = `${prev2Year}-${String(prev2Month).padStart(2,"0")}-01`;

    const salesYear  = Number(req.query.sales_year  || prevYear);
    const salesMonth = Number(req.query.sales_month || prevMonth);
    if (salesMonth < 1 || salesMonth > 12 || salesYear < 2000 || salesYear > 2100) {
      return res.status(400).json({ message: "Período de ventas inválido" });
    }
    const salesStart = `${salesYear}-${String(salesMonth).padStart(2,"0")}-01`;
    const salesEnd   = salesMonth === 12
      ? `${salesYear + 1}-01-01`
      : `${salesYear}-${String(salesMonth + 1).padStart(2,"0")}-01`;

    const bid = forcedBrandId; // alias corto para los replacements

    // ── 1) KPIs ──────────────────────────────────────────────────────────────
    const [kpiResult] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM sales s
         WHERE s.sale_date >= :monthStart AND s.sale_date < :monthEnd
           AND (:bid = 0 OR s.brand_id = :bid)
        ) AS sales_this_month,
        (SELECT COUNT(*) FROM commission_runs cr
         WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
           AND cr.status IN ('CALCULATED','APPROVED','PAID')
           AND (:bid = 0 OR cr.brand_id = :bid)
        ) AS commissions_calculated,
        (SELECT COUNT(*) FROM commission_runs cr
         WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
           AND cr.status IN ('APPROVED','PAID')
           AND (:bid = 0 OR cr.brand_id = :bid)
        ) AS commissions_approved,
        (SELECT COALESCE(SUM(cr.total_commission),0) FROM commission_runs cr
         WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
           AND cr.status IN ('APPROVED','PAID')
           AND (:bid = 0 OR cr.brand_id = :bid)
        ) AS total_paid,
        (SELECT COUNT(*) FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'ADVISOR' AND u.is_active = 1
           AND (:bid = 0 OR EXISTS (
             SELECT 1 FROM user_brand_access uba
             WHERE uba.user_id = u.id AND uba.brand_id = :bid
           ))
        ) AS active_advisors,
        (SELECT COUNT(*) FROM commission_runs cr
         WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
           AND cr.status = 'DRAFT'
           AND (:bid = 0 OR cr.brand_id = :bid)
        ) AS commissions_pending,
        (SELECT COALESCE(AVG(cr.total_commission),0) FROM commission_runs cr
         WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
           AND cr.status IN ('CALCULATED','APPROVED','PAID')
           AND (:bid = 0 OR cr.brand_id = :bid)
        ) AS avg_commission,
        (SELECT COUNT(*) FROM sales s
         WHERE s.sale_date >= :month2Start AND s.sale_date < :monthStart
           AND (:bid = 0 OR s.brand_id = :bid)
        ) AS prev_sales,
        (SELECT COUNT(*) FROM commission_runs cr
         WHERE cr.cut_year = :prev2Year AND cr.cut_month = :prev2Month
           AND cr.status IN ('CALCULATED','APPROVED','PAID')
           AND (:bid = 0 OR cr.brand_id = :bid)
        ) AS prev_commissions_calculated,
        (SELECT COALESCE(SUM(cr.total_commission),0) FROM commission_runs cr
         WHERE cr.cut_year = :prev2Year AND cr.cut_month = :prev2Month
           AND cr.status IN ('APPROVED','PAID')
           AND (:bid = 0 OR cr.brand_id = :bid)
        ) AS prev_total_paid,
        (SELECT COALESCE(AVG(cr.total_commission),0) FROM commission_runs cr
         WHERE cr.cut_year = :prev2Year AND cr.cut_month = :prev2Month
           AND cr.status IN ('CALCULATED','APPROVED','PAID')
           AND (:bid = 0 OR cr.brand_id = :bid)
        ) AS prev_avg_commission
    `, {
      replacements: { monthStart, monthEnd, month2Start, prevYear, prevMonth, prev2Year, prev2Month, bid },
    });
    const kpiRows = kpiResult?.[0] ?? {};

    // ── 2) Trend mensual 6 meses ─────────────────────────────────────────────
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
        AND (:bid = 0 OR cr.brand_id = :bid)
      GROUP BY cr.cut_year, cr.cut_month, b.id
      ORDER BY cr.cut_year ASC, cr.cut_month ASC
    `, {
      replacements: (() => {
        let m1 = thisMonth - 5, y1 = thisYear;
        if (m1 <= 0) { m1 += 12; y1 -= 1; }
        return { y1, m1, y2: thisYear, m2: thisMonth, bid };
      })(),
    });

    // ── 3) Top 5 asesores ────────────────────────────────────────────────────
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
        AND (:bid = 0 OR cr.brand_id = :bid)
      GROUP BY u.id
      ORDER BY total_commission DESC
      LIMIT 5
    `, { replacements: { prevYear, prevMonth, bid } });

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
        AND (:bid = 0 OR cr.brand_id = :bid)
      GROUP BY b.id
      ORDER BY total_commission DESC
    `, { replacements: { prevYear, prevMonth, bid } });

    // ── 5) Últimas 5 corridas ─────────────────────────────────────────────────
    const [recentRuns] = await sequelize.query(`
      SELECT cr.id, cr.cut_year, cr.cut_month, cr.fortnight,
        cr.status, cr.total_commission, cr.units_total, cr.updated_at,
        u.full_name AS advisor_name, b.code AS brand_code, b.name AS brand_name
      FROM commission_runs cr
      JOIN users u ON u.id = cr.advisor_id
      JOIN brands b ON b.id = cr.brand_id
      WHERE (:bid = 0 OR cr.brand_id = :bid)
      ORDER BY cr.updated_at DESC
      LIMIT 5
    `, { replacements: { bid } });

    // ── 6) Asesores SIN comisión calculada ───────────────────────────────────
    const [pendingAdvisors] = await sequelize.query(`
      SELECT u.id, u.full_name, u.email, br.name AS branch_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN branches br ON br.id = u.branch_id
      WHERE r.name = 'ADVISOR' AND u.is_active = 1
        AND (:bid = 0 OR EXISTS (
          SELECT 1 FROM user_brand_access uba
          WHERE uba.user_id = u.id AND uba.brand_id = :bid
        ))
        AND u.id NOT IN (
          SELECT cr.advisor_id FROM commission_runs cr
          WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
            AND cr.status IN ('CALCULATED','APPROVED','PAID')
            AND (:bid = 0 OR cr.brand_id = :bid)
        )
      ORDER BY u.full_name ASC
    `, { replacements: { prevYear, prevMonth, bid } });

    // ── 7) Top 5 vehículos ────────────────────────────────────────────────────
    const [topVehicles] = await sequelize.query(`
      SELECT v.id, v.code, v.model, v.version, v.sale_price,
        COUNT(cri.id)                    AS units_sold,
        COALESCE(SUM(cri.rate_amount),0) AS total_commission
      FROM commission_run_items cri
      JOIN commission_runs cr ON cr.id = cri.run_id
      JOIN vehicles v ON v.id = cri.vehicle_id
      WHERE cr.cut_year = :prevYear AND cr.cut_month = :prevMonth
        AND cr.status IN ('CALCULATED','APPROVED','PAID')
        AND (:bid = 0 OR cr.brand_id = :bid)
      GROUP BY v.id
      ORDER BY total_commission DESC
      LIMIT 5
    `, { replacements: { prevYear, prevMonth, bid } });

    // ── 8) Ventas del mes ─────────────────────────────────────────────────────
    const [salesSummaryRows] = await sequelize.query(`
      SELECT
        COUNT(*)                         AS total_units,
        COUNT(DISTINCT s.advisor_id)     AS advisors_with_sales,
        COUNT(DISTINCT s.vehicle_id)     AS distinct_vehicles,
        COALESCE(SUM(v.sale_price),0)    AS total_value
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.sale_date >= :salesStart AND s.sale_date < :salesEnd
        AND (:bid = 0 OR s.brand_id = :bid)
    `, { replacements: { salesStart, salesEnd, bid } });

    const [salesByAdvisor] = await sequelize.query(`
      SELECT u.id, u.full_name,
        COUNT(s.id)                   AS units,
        COALESCE(SUM(v.sale_price),0) AS total_value
      FROM sales s
      JOIN users    u ON u.id = s.advisor_id
      JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.sale_date >= :salesStart AND s.sale_date < :salesEnd
        AND (:bid = 0 OR s.brand_id = :bid)
      GROUP BY u.id
      ORDER BY units DESC
      LIMIT 10
    `, { replacements: { salesStart, salesEnd, bid } });

    const [salesByVehicle] = await sequelize.query(`
      SELECT v.model, v.version,
        COUNT(s.id)                   AS units,
        COALESCE(SUM(v.sale_price),0) AS total_value
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.sale_date >= :salesStart AND s.sale_date < :salesEnd
        AND (:bid = 0 OR s.brand_id = :bid)
      GROUP BY v.id
      ORDER BY units DESC
      LIMIT 8
    `, { replacements: { salesStart, salesEnd, bid } });

    // ── 9) Sparkline ──────────────────────────────────────────────────────────
    const [sparkline] = await sequelize.query(`
      SELECT cut_year, cut_month,
        COALESCE(SUM(total_commission),0) AS total,
        COALESCE(SUM(units_total),0)      AS units
      FROM commission_runs cr
      WHERE cr.status IN ('CALCULATED','APPROVED','PAID')
        AND ((cr.cut_year = :y1 AND cr.cut_month >= :m1) OR (cr.cut_year = :y2 AND cr.cut_month <= :m2))
        AND (:bid = 0 OR cr.brand_id = :bid)
      GROUP BY cut_year, cut_month
      ORDER BY cut_year ASC, cut_month ASC
    `, {
      replacements: (() => {
        let m1 = thisMonth - 5, y1 = thisYear;
        if (m1 <= 0) { m1 += 12; y1 -= 1; }
        return { y1, m1, y2: thisYear, m2: thisMonth, bid };
      })(),
    });

    res.json({
      ok: true,
      data: {
        period:         { year: prevYear, month: prevMonth },
        salesPeriod:    { year: salesYear, month: salesMonth },
        brandId:        forcedBrandId,   // útil para debug / frontend
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