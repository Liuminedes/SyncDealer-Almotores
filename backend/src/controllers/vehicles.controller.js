// backend/src/controllers/vehicles.controller.js
// CAMBIOS vs original: +importVehicles +downloadTemplate
import {
  listVehicles, getVehicleById, createVehicle, updateVehicle, setVehicleStatus,
} from "../services/vehicles/vehicles.service.js";

import {
  importVehiclesFromExcel, generateImportTemplate,
} from "../services/vehicles/vehicles.import.service.js";

export async function list(req, res, next) {
  try { res.json({ ok: true, data: await listVehicles(req.query) }); } catch (e) { next(e); }
}
export async function getById(req, res, next) {
  try { res.json({ ok: true, data: await getVehicleById(req.params.id) }); } catch (e) { next(e); }
}
export async function create(req, res, next) {
  try { res.status(201).json({ ok: true, data: await createVehicle(req.body) }); } catch (e) { next(e); }
}
export async function update(req, res, next) {
  try { res.json({ ok: true, data: await updateVehicle(req.params.id, req.body) }); } catch (e) { next(e); }
}
export async function setStatus(req, res, next) {
  try { res.json({ ok: true, data: await setVehicleStatus(req.params.id, req.body.is_active) }); } catch (e) { next(e); }
}

export async function importVehicles(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: "No se recibió ningún archivo" });
    const brand_id = Number(req.query.brand_id || req.body.brand_id);
    if (!brand_id) return res.status(400).json({ ok: false, message: "brand_id es requerido" });
    const results = await importVehiclesFromExcel(req.file.buffer, brand_id);
    const { created, updated, skipped } = results;
    const parts = [`${created} creados`, `${updated} actualizados`, ...(skipped > 0 ? [`${skipped} omitidos`] : [])];
    res.json({ ok: true, message: `Importación completada: ${parts.join(", ")}`, data: results });
  } catch (e) { next(e); }
}

export async function downloadTemplate(req, res, next) {
  try {
    const buffer = generateImportTemplate();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="plantilla_vehiculos.xlsx"');
    res.send(buffer);
  } catch (e) { next(e); }
}
