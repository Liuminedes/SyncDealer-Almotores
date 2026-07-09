// backend/src/controllers/sales.import.controller.js
import {
  preValidateSalesExcel,
  importSalesFromExcel,
  generateSalesImportTemplate,
} from "../services/sales/sales.import.service.js";

/**
 * POST /sales/import/preview?brand_id=6
 * Analiza el Excel y devuelve el resumen de validación sin insertar nada.
 * El frontend lo muestra al usuario antes de confirmar la importación.
 */
export async function previewImport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: "No se recibió ningún archivo" });
    const brand_id = Number(req.query.brand_id || req.body.brand_id);
    if (!brand_id) return res.status(400).json({ ok: false, message: "brand_id es requerido" });

    const result = await preValidateSalesExcel(req.file.buffer, brand_id);
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
}

/**
 * POST /sales/import/confirm?brand_id=6
 * Ejecuta la importación después de que el usuario confirmó el preview.
 */
export async function confirmImport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: "No se recibió ningún archivo" });
    const brand_id = Number(req.query.brand_id || req.body.brand_id);
    if (!brand_id) return res.status(400).json({ ok: false, message: "brand_id es requerido" });

    const results = await importSalesFromExcel(req.file.buffer, brand_id);
    const { created, updated, skipped } = results;
    const parts = [`${created} creadas`, `${updated} actualizadas`, ...(skipped > 0 ? [`${skipped} omitidas`] : [])];

    res.json({ ok: true, message: `Importación completada: ${parts.join(", ")}`, data: results });
  } catch (err) { next(err); }
}

/**
 * GET /sales/import/template
 * Descarga plantilla Excel con las columnas correctas.
 */
export async function downloadTemplate(req, res, next) {
  try {
    const buffer = generateSalesImportTemplate();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="plantilla_ventas.xlsx"');
    res.send(buffer);
  } catch (err) { next(err); }
}
