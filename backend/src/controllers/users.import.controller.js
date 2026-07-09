// backend/src/controllers/users.import.controller.js
import {
  importUsersFromExcel,
  generateUsersImportTemplate,
} from "../services/users/users.import.service.js";

export async function importUsers(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: "No se recibió ningún archivo" });
    const results = await importUsersFromExcel(req.file.buffer);
    const { created, updated, skipped } = results;
    const parts = [`${created} creados`, `${updated} actualizados`, ...(skipped > 0 ? [`${skipped} omitidos`] : [])];
    res.json({ ok: true, message: `Importación completada: ${parts.join(", ")}`, data: results });
  } catch (err) { next(err); }
}

export async function downloadUsersTemplate(req, res, next) {
  try {
    const buffer = generateUsersImportTemplate();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="plantilla_asesores.xlsx"');
    res.send(buffer);
  } catch (err) { next(err); }
}
