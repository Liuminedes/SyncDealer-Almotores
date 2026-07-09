import { sequelize } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

export async function listBranches(req, res, next) {
  try {
    const [rows] = await sequelize.query(
      `SELECT id, name, code, is_active FROM branches ORDER BY name ASC`
    );
    res.json({ ok: true, data: { items: rows || [], total: rows?.length || 0 } });
  } catch (err) { next(err); }
}

export async function getBranchById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new HttpError(400, "ID inválido");
    const [rows] = await sequelize.query(
      `SELECT id, name, code, is_active FROM branches WHERE id = :id LIMIT 1`,
      { replacements: { id } }
    );
    if (!rows?.[0]) throw new HttpError(404, "Sede no encontrada");
    res.json({ ok: true, data: rows[0] });
  } catch (err) { next(err); }
}

export async function createBranch(req, res, next) {
  try {
    const { name, code, is_active = true } = req.body;
    if (!name?.trim()) throw new HttpError(400, "El nombre es obligatorio");
    if (!code?.trim()) throw new HttpError(400, "El código es obligatorio");

    // Verificar duplicado de código
    const [dup] = await sequelize.query(
      `SELECT id FROM branches WHERE code = :code LIMIT 1`,
      { replacements: { code: code.trim().toUpperCase() } }
    );
    if (dup?.[0]) throw new HttpError(409, `Ya existe una sede con el código "${code.toUpperCase()}"`);

    const [result] = await sequelize.query(
      `INSERT INTO branches (name, code, is_active, created_at, updated_at)
       VALUES (:name, :code, :is_active, NOW(), NOW())`,
      { replacements: { name: name.trim(), code: code.trim().toUpperCase(), is_active: is_active ? 1 : 0 } }
    );

    const [rows] = await sequelize.query(
      `SELECT id, name, code, is_active FROM branches WHERE id = :id LIMIT 1`,
      { replacements: { id: result } }
    );
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateBranch(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new HttpError(400, "ID inválido");

    const { name, code, is_active } = req.body;
    if (!name?.trim()) throw new HttpError(400, "El nombre es obligatorio");
    if (!code?.trim()) throw new HttpError(400, "El código es obligatorio");

    // Verificar que existe
    const [exist] = await sequelize.query(
      `SELECT id FROM branches WHERE id = :id LIMIT 1`,
      { replacements: { id } }
    );
    if (!exist?.[0]) throw new HttpError(404, "Sede no encontrada");

    // Verificar duplicado de código (excluyendo la propia)
    const [dup] = await sequelize.query(
      `SELECT id FROM branches WHERE code = :code AND id != :id LIMIT 1`,
      { replacements: { code: code.trim().toUpperCase(), id } }
    );
    if (dup?.[0]) throw new HttpError(409, `Ya existe otra sede con el código "${code.toUpperCase()}"`);

    await sequelize.query(
      `UPDATE branches SET name = :name, code = :code, is_active = :is_active, updated_at = NOW()
       WHERE id = :id`,
      { replacements: { id, name: name.trim(), code: code.trim().toUpperCase(), is_active: is_active ? 1 : 0 } }
    );

    const [rows] = await sequelize.query(
      `SELECT id, name, code, is_active FROM branches WHERE id = :id LIMIT 1`,
      { replacements: { id } }
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteBranch(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new HttpError(400, "ID inválido");

    // Verificar que no tenga usuarios asignados
    const [users] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM users WHERE branch_id = :id`,
      { replacements: { id } }
    );
    if (Number(users?.[0]?.total) > 0)
      throw new HttpError(409, "No se puede eliminar: hay usuarios asignados a esta sede");

    const [exist] = await sequelize.query(
      `SELECT id FROM branches WHERE id = :id LIMIT 1`,
      { replacements: { id } }
    );
    if (!exist?.[0]) throw new HttpError(404, "Sede no encontrada");

    await sequelize.query(`DELETE FROM branches WHERE id = :id`, { replacements: { id } });
    res.json({ ok: true, message: "Sede eliminada" });
  } catch (err) { next(err); }
}