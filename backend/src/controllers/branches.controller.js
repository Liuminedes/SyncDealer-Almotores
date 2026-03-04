import { sequelize } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

export async function listBranches(req, res, next) {
  try {
    const [rows] = await sequelize.query(
      `SELECT id, name, code, is_active FROM branches ORDER BY name ASC`
    );

    res.json({
      ok:   true,
      data: {
        items:      rows || [],
        total:      rows?.length || 0,
        page:       1,
        limit:      rows?.length || 0,
        totalPages: 1,
      },
    });
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
}