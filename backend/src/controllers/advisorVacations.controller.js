// src/controllers/advisorVacations.controller.js
import { sequelize } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

// ── Listar vacaciones de un asesor ────────────────────────────────────────────
export async function listVacations(req, res, next) {
  try {
    const advisorId = Number(req.params.advisorId);
    if (!advisorId) throw new HttpError(400, "ID de asesor inválido");

    const [rows] = await sequelize.query(
      `SELECT id, advisor_id, start_date, end_date, is_active, notes, created_at
       FROM advisor_vacations
       WHERE advisor_id = :advisor_id
       ORDER BY start_date DESC`,
      { replacements: { advisor_id: advisorId } }
    );

    res.json({ ok: true, data: rows || [] });
  } catch (err) { next(err); }
}

// ── Crear vacación ────────────────────────────────────────────────────────────
export async function createVacation(req, res, next) {
  try {
    const advisorId = Number(req.params.advisorId);
    if (!advisorId) throw new HttpError(400, "ID de asesor inválido");

    const { start_date, end_date, notes, is_active = true } = req.body;
    if (!start_date || !end_date) throw new HttpError(400, "start_date y end_date son obligatorios");
    if (new Date(start_date) > new Date(end_date))
      throw new HttpError(400, "start_date no puede ser mayor que end_date");

    // Verificar que el asesor existe
    const [userRows] = await sequelize.query(
      `SELECT id FROM users WHERE id = :advisor_id LIMIT 1`,
      { replacements: { advisor_id: advisorId } }
    );
    if (!userRows?.[0]) throw new HttpError(404, "Asesor no encontrado");

    const [, meta] = await sequelize.query(
      `INSERT INTO advisor_vacations (advisor_id, start_date, end_date, is_active, notes, created_at, updated_at)
   VALUES (:advisor_id, :start_date, :end_date, :is_active, :notes, NOW(), NOW())`,
      {
        replacements: {
          advisor_id: advisorId,
          start_date,
          end_date,
          is_active: is_active ? 1 : 0,
          notes: notes || null,
        },
        type: sequelize.QueryTypes.INSERT,
      }
    );

    const newId = meta; // con QueryTypes.INSERT, meta es directamente el insertId

    const [newRow] = await sequelize.query(
      `SELECT id, advisor_id, start_date, end_date, is_active, notes, created_at
   FROM advisor_vacations WHERE id = :newId LIMIT 1`,
      { replacements: { newId } }
    );

    res.status(201).json({ ok: true, data: newRow?.[0], message: "Ausencia registrada" });
  } catch (err) { next(err); }
}

// ── Actualizar vacación ───────────────────────────────────────────────────────
export async function updateVacation(req, res, next) {
  try {
    const advisorId = Number(req.params.advisorId);
    const vacationId = Number(req.params.id);
    if (!advisorId || !vacationId) throw new HttpError(400, "IDs inválidos");

    const [existing] = await sequelize.query(
      `SELECT id FROM advisor_vacations WHERE id = :id AND advisor_id = :advisor_id LIMIT 1`,
      { replacements: { id: vacationId, advisor_id: advisorId } }
    );
    if (!existing?.[0]) throw new HttpError(404, "Ausencia no encontrada");

    const { start_date, end_date, notes, is_active } = req.body;
    if (start_date && end_date && new Date(start_date) > new Date(end_date))
      throw new HttpError(400, "start_date no puede ser mayor que end_date");

    const fields = [];
    const replacements = { id: vacationId };

    if (start_date !== undefined) { fields.push("start_date = :start_date"); replacements.start_date = start_date; }
    if (end_date !== undefined) { fields.push("end_date = :end_date"); replacements.end_date = end_date; }
    if (notes !== undefined) { fields.push("notes = :notes"); replacements.notes = notes || null; }
    if (is_active !== undefined) { fields.push("is_active = :is_active"); replacements.is_active = is_active ? 1 : 0; }

    if (!fields.length) throw new HttpError(400, "Nada que actualizar");

    await sequelize.query(
      `UPDATE advisor_vacations SET ${fields.join(", ")}, updated_at = NOW() WHERE id = :id`,
      { replacements }
    );

    const [updated] = await sequelize.query(
      `SELECT id, advisor_id, start_date, end_date, is_active, notes, created_at
       FROM advisor_vacations WHERE id = :id LIMIT 1`,
      { replacements: { id: vacationId } }
    );

    res.json({ ok: true, data: updated?.[0], message: "Ausencia actualizada" });
  } catch (err) { next(err); }
}

// ── Eliminar vacación ─────────────────────────────────────────────────────────
export async function deleteVacation(req, res, next) {
  try {
    const advisorId = Number(req.params.advisorId);
    const vacationId = Number(req.params.id);
    if (!advisorId || !vacationId) throw new HttpError(400, "IDs inválidos");

    const [existing] = await sequelize.query(
      `SELECT id FROM advisor_vacations WHERE id = :id AND advisor_id = :advisor_id LIMIT 1`,
      { replacements: { id: vacationId, advisor_id: advisorId } }
    );
    if (!existing?.[0]) throw new HttpError(404, "Ausencia no encontrada");

    await sequelize.query(
      `DELETE FROM advisor_vacations WHERE id = :id`,
      { replacements: { id: vacationId } }
    );

    res.json({ ok: true, message: "Ausencia eliminada" });
  } catch (err) { next(err); }
}