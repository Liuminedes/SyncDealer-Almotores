// backend/src/controllers/exports.controller.js
import archiver from "archiver";
import { PassThrough } from "stream";
import { sequelize }          from "../config/db.js";
import { HttpError }          from "../utils/httpError.js";
import { generateCommissionPdf } from "../utils/pdfCommission.js";
import { sendCommissionsToHR }   from "../utils/mailer.js";

const MONTHS_ES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// Nombre de archivo: "987654321 SEBASTIAN ESPINOSA" → "987654321_Sebastian_Espinosa"
function advisorFileName(run) {
  const doc  = run.advisor_document || "";
  const name = (run.advisor_name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)                          // máx 3 palabras para no hacer el nombre muy largo
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("_");
  const period = `${run.cut_year}_${String(run.cut_month).padStart(2,"0")}`;
  return doc ? `${doc}_${name}_${period}` : `${name}_${period}`;
}

// ── Obtener corridas listas para exportar (ASST_VALIDATED) ───────────────────
export async function listExportable(req, res, next) {
  try {
    const role      = String(req.user?.role || "").toUpperCase();
    const isBrandOp = ["ASSISTANT_SALES","BRAND_MANAGER"].includes(role);

    // Para BrandOp: obtener su brand_id autorizado (paramétrico, nunca concatenado)
    let authorizedBrandId = 0; // 0 = sin filtro (ADMIN ve todo)
    if (isBrandOp) {
      const [br] = await sequelize.query(
        `SELECT brand_id FROM user_brand_access WHERE user_id = :uid ORDER BY brand_id ASC LIMIT 1`,
        { replacements: { uid: req.user.id } }
      );
      authorizedBrandId = Number(br?.[0]?.brand_id ?? 0);
      if (!authorizedBrandId) {
        // BrandOp sin marca asignada → no ve nada
        return res.json({ ok: true, data: { items: [], total: 0 } });
      }
    }

    const year  = Number(req.query.year  || new Date().getFullYear());
    const month = Number(req.query.month || new Date().getMonth() + 1);

    // Validar rango de período
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      throw new HttpError(400, "Período inválido");
    }

    // SEGURO: brand_id siempre va como replacement, nunca concatenado
    const [rows] = await sequelize.query(`
      SELECT cr.id, cr.cut_year, cr.cut_month, cr.fortnight,
             cr.status, cr.total_commission, cr.units_total,
             u.full_name AS advisor_name, u.document_number AS advisor_document,
             b.code AS brand_code, b.name AS brand_name
      FROM commission_runs cr
      JOIN users  u ON u.id = cr.advisor_id
      JOIN brands b ON b.id = cr.brand_id
      WHERE cr.cut_year = :year AND cr.cut_month = :month
        AND cr.status = 'ASST_VALIDATED'
        AND (:authorizedBrandId = 0 OR cr.brand_id = :authorizedBrandId)
      ORDER BY b.code ASC, u.full_name ASC
    `, { replacements: { year, month, authorizedBrandId } });

    res.json({ ok: true, data: { items: rows, total: rows.length } });
  } catch (err) { next(err); }
}


// ── Construir PDFs + ZIP en memoria ─────────────────────────────────────────
async function buildZip(runIds) {
  // Obtener datos completos de cada corrida
  const runs = await Promise.all(runIds.map(async (id) => {
    const [runRows] = await sequelize.query(`
      SELECT cr.*, b.code AS brand_code, b.name AS brand_name,
             u.full_name AS advisor_name, u.document_number AS advisor_document,
             u.email AS advisor_email, u.phone AS advisor_phone,
             u.hire_date AS advisor_hire_date, br.name AS advisor_branch
      FROM commission_runs cr
      JOIN brands  b  ON b.id  = cr.brand_id
      JOIN users   u  ON u.id  = cr.advisor_id
      LEFT JOIN branches br ON br.id = u.branch_id
      WHERE cr.id = :id LIMIT 1
    `, { replacements: { id } });

    const run = runRows?.[0];
    if (!run) return null;

    const [items] = await sequelize.query(`
      SELECT cri.*, s.sale_date, s.invoice, s.client_name, s.plate,
             s.cut_month AS sale_cut_month, s.fortnight AS sale_fortnight,
             v.code AS vehicle_code, v.model AS vehicle_model, v.version AS vehicle_version,
             ct.tier_name
      FROM commission_run_items cri
      JOIN sales    s  ON s.id  = cri.sale_id
      JOIN vehicles v  ON v.id  = cri.vehicle_id
      LEFT JOIN commission_tiers ct ON ct.id = cri.tier_id
      WHERE cri.run_id = :id ORDER BY cri.id ASC
    `, { replacements: { id } });

    return { run, items: items || [] };
  }));

  // Generar todos los PDFs en paralelo
  const pdfs = await Promise.all(
    runs.filter(Boolean).map(async ({ run, items }) => {
      const buf  = await generateCommissionPdf(run, items);
      const name = `${run.brand_code}_${advisorFileName(run)}.pdf`;
      return { buf, name, run };
    })
  );

  // Empaquetar en ZIP
  return new Promise((resolve, reject) => {
    const passThrough = new PassThrough();
    const chunks = [];
    passThrough.on("data", c => chunks.push(c));
    passThrough.on("end",  () => resolve({ zip: Buffer.concat(chunks), pdfs }));
    passThrough.on("error", reject);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", reject);
    archive.pipe(passThrough);

    pdfs.forEach(({ buf, name }) => archive.append(buf, { name }));
    archive.finalize();
  });
}

// ── Helper: sanitizar y verificar autorización de run_ids ────────────────────
async function authorizeRunIds(runIds, user) {
  // Sanitizar — solo enteros positivos
  const sanitized = runIds.map(Number).filter(n => Number.isInteger(n) && n > 0);
  if (sanitized.length !== runIds.length)
    throw new HttpError(400, "run_ids contiene valores inválidos");

  const role      = String(user?.role || "").toUpperCase();
  const isBrandOp = ["ASSISTANT_SALES", "BRAND_MANAGER"].includes(role);
  const replacements = { ids: sanitized };
  let brandFilter = "";

  if (isBrandOp) {
    const [br] = await sequelize.query(
      `SELECT brand_id FROM user_brand_access WHERE user_id = :uid LIMIT 1`,
      { replacements: { uid: user.id } }
    );
    const authorizedBrandId = Number(br?.[0]?.brand_id ?? 0);
    if (!authorizedBrandId) throw new HttpError(403, "Sin marca asignada");
    brandFilter = "AND cr.brand_id = :authorizedBrandId";
    replacements.authorizedBrandId = authorizedBrandId;
  }

  // Verificar que TODOS los IDs pertenecen a la marca autorizada
  const [verified] = await sequelize.query(
    `SELECT id FROM commission_runs cr WHERE cr.id IN (:ids) ${brandFilter}`,
    { replacements }
  );
  if (verified.length !== sanitized.length)
    throw new HttpError(403, "Uno o más IDs no pertenecen a tu marca autorizada");

  return sanitized;
}

// ── Descargar ZIP ─────────────────────────────────────────────────────────────
export async function downloadZip(req, res, next) {
  try {
    const { run_ids, year, month } = req.body;
    if (!Array.isArray(run_ids) || run_ids.length === 0)
      throw new HttpError(400, "Debes seleccionar al menos una corrida");

    const sanitizedIds = await authorizeRunIds(run_ids, req.user);
    const { zip } = await buildZip(sanitizedIds);
    const filename = `comisiones_${year || ""}${month ? "_" + String(month).padStart(2,"0") : ""}.zip`;

    res.setHeader("Content-Type",        "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length",      zip.length);
    res.end(zip);
  } catch (err) { next(err); }
}

// ── Enviar por email a RRHH + marcar SENT_TO_HR ──────────────────────────────
export async function sendToHRBulk(req, res, next) {
  try {
    const { run_ids, year, month, brand } = req.body;
    if (!Array.isArray(run_ids) || run_ids.length === 0)
      throw new HttpError(400, "Debes seleccionar al menos una corrida");

    // SEGURO: valida que los IDs pertenecen a la marca del usuario autenticado
    const sanitizedIds = await authorizeRunIds(run_ids, req.user);

    const { zip } = await buildZip(sanitizedIds);

    // Enviar email
    await sendCommissionsToHR(zip, {
      month:  Number(month),
      year:   Number(year),
      brand:  brand || null,
      count:  sanitizedIds.length,
    });

    // Marcar como SENT_TO_HR — usando IN(:ids) con replacements seguros
    await sequelize.query(
      `UPDATE commission_runs SET status = 'SENT_TO_HR', updated_at = NOW()
       WHERE id IN (:ids)`,
      { replacements: { ids: sanitizedIds }, type: sequelize.QueryTypes.UPDATE }
    );

    res.json({
      ok: true,
      message: `${sanitizedIds.length} comisión(es) enviadas a Talento Humano`,
      data: { sent: sanitizedIds.length },
    });
  } catch (err) { next(err); }
}

// ── Descargar PDF individual ──────────────────────────────────────────────────
export async function downloadSinglePdf(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new HttpError(400, "ID inválido");

    const [runRows] = await sequelize.query(`
      SELECT cr.*, b.code AS brand_code, b.name AS brand_name,
             u.full_name AS advisor_name, u.document_number AS advisor_document,
             u.email AS advisor_email, u.phone AS advisor_phone,
             u.hire_date AS advisor_hire_date, br.name AS advisor_branch
      FROM commission_runs cr
      JOIN brands  b  ON b.id  = cr.brand_id
      JOIN users   u  ON u.id  = cr.advisor_id
      LEFT JOIN branches br ON br.id = u.branch_id
      WHERE cr.id = :id LIMIT 1
    `, { replacements: { id } });

    const run = runRows?.[0];
    if (!run) throw new HttpError(404, "Corrida no encontrada");

    const [items] = await sequelize.query(`
      SELECT cri.*, s.sale_date, s.invoice, s.client_name, s.plate,
             s.cut_month AS sale_cut_month, s.fortnight AS sale_fortnight,
             v.code AS vehicle_code, v.model AS vehicle_model, v.version AS vehicle_version,
             ct.tier_name
      FROM commission_run_items cri
      JOIN sales    s  ON s.id  = cri.sale_id
      JOIN vehicles v  ON v.id  = cri.vehicle_id
      LEFT JOIN commission_tiers ct ON ct.id = cri.tier_id
      WHERE cri.run_id = :id ORDER BY cri.id ASC
    `, { replacements: { id } });

    const pdf      = await generateCommissionPdf(run, items || []);
    const filename = `${run.brand_code}_${advisorFileName(run)}.pdf`;

    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length",      pdf.length);
    res.end(pdf);
  } catch (err) { next(err); }
}