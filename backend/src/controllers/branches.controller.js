import { sequelize } from "../config/db.js";

export async function listBranches(req, res, next) {
  try {
    const [rows] = await sequelize.query(
      `SELECT id, name, code, is_active FROM branches ORDER BY name`
    );
    res.json({ branches: rows });
  } catch (err) {
    next(err);
  }
}
