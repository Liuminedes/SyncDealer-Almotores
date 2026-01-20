import { sequelize } from "../config/db.js";

export async function listMyBrands(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await sequelize.query(
      `
      SELECT b.id, b.name, b.code, uba.can_view, uba.can_generate
      FROM user_brand_access uba
      JOIN brands b ON b.id = uba.brand_id
      WHERE uba.user_id = :userId
      ORDER BY b.code
      `,
      { replacements: { userId } }
    );

    res.json({ brands: rows });
  } catch (err) {
    next(err);
  }
}
