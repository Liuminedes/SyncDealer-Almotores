import { sequelize } from "../config/db.js";
import Brand from "../models/Brand.js";

export async function listMyBrands(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await sequelize.query(
      `
      SELECT b.id, b.name, b.code, b.is_active, uba.can_view, uba.can_generate
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

// ✅ ADMIN: lista todas las marcas
export async function adminListBrands(req, res, next) {
  try {
    const [rows] = await sequelize.query(
      `
      SELECT id, name, code, is_active, created_at, updated_at
      FROM brands
      ORDER BY code
      `
    );

    res.json({ brands: rows });
  } catch (err) {
    next(err);
  }
}

// ✅ ADMIN: crea marca
export async function adminCreateBrand(req, res, next) {
  try {
    const { name, code, is_active } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: "name y code son obligatorios" });
    }

    const created = await Brand.create({
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      is_active: is_active !== false,
    });

    // ✅ CLAVE: auto-asignar la marca al usuario que la crea (ADMIN)
    // Así /brands (mis marcas) la devuelve y se refleja en todos los selects.
    await sequelize.query(
      `
      INSERT INTO user_brand_access (user_id, brand_id, can_view, can_generate, created_at, updated_at)
      VALUES (:userId, :brandId, 1, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        can_view = VALUES(can_view),
        can_generate = VALUES(can_generate),
        updated_at = NOW()
      `,
      {
        replacements: {
          userId: req.user.id,
          brandId: created.id,
        },
      }
    );

    res.status(201).json({ brand: created });
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Ya existe una marca con ese código" });
    }
    next(err);
  }
}


// ✅ ADMIN: actualiza marca
export async function adminUpdateBrand(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { name, code, is_active } = req.body;

    const brand = await Brand.findByPk(id);
    if (!brand) return res.status(404).json({ message: "Marca no encontrada" });

    if (name != null) brand.name = String(name).trim();
    if (code != null) brand.code = String(code).trim().toUpperCase();
    if (is_active != null) brand.is_active = !!is_active;

    await brand.save();

    res.json({ brand });
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Ya existe una marca con ese código" });
    }
    next(err);
  }
}

// ✅ ADMIN: obtiene una marca por id
export async function adminGetBrandById(req, res, next) {
  try {
    const id = Number(req.params.id);

    const brand = await Brand.findByPk(id);
    if (!brand) return res.status(404).json({ message: "Marca no encontrada" });

    res.json({ brand });
  } catch (err) {
    next(err);
  }
}
