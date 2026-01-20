import { sequelize } from "../config/db.js";

export async function listSchemesByBrand(req, res, next) {
  try {
    const brandCode = req.brand.code;

    const [rows] = await sequelize.query(
      `
      SELECT cs.*
      FROM commission_schemes cs
      JOIN brands b ON b.id = cs.brand_id
      WHERE b.code = :brandCode
      ORDER BY cs.id DESC
      `,
      { replacements: { brandCode } }
    );

    res.json({ brand: brandCode, schemes: rows });
  } catch (err) {
    next(err);
  }
}
