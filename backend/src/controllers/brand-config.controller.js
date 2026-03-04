import CommissionScheme from "../models/CommissionScheme.js";
import CommissionTier from "../models/CommissionTier.js";
import Brand from "../models/Brand.js";

async function ensureDefaultPercentageTiers(schemeId) {
  // Si ya existen tiers, no hacemos nada
  const count = await CommissionTier.count({ where: { scheme_id: schemeId } });
  if (count > 0) return;

  // Seed estándar 1..5+ para que el frontend pueda renderizar la matriz de porcentajes
  await CommissionTier.bulkCreate([
    { scheme_id: schemeId, tier_name: "1_UNIDAD", min_units: 1, max_units: 1, priority: 1, rate_percent: null },
    { scheme_id: schemeId, tier_name: "2_UNIDADES", min_units: 2, max_units: 2, priority: 2, rate_percent: null },
    { scheme_id: schemeId, tier_name: "3_UNIDADES", min_units: 3, max_units: 3, priority: 3, rate_percent: null },
    { scheme_id: schemeId, tier_name: "4_UNIDADES", min_units: 4, max_units: 4, priority: 4, rate_percent: null },
    { scheme_id: schemeId, tier_name: "5_MAS", min_units: 5, max_units: null, priority: 5, rate_percent: null },
  ]);
}

// Normaliza sin romper legacy: si tu BD tiene STANDARD / KIA_PLAN, igual lo devolvemos tal cual.
export async function getBrandScheme(req, res, next) {
  try {
    const brandId = Number(req.params.brandId);

    const brand = await Brand.findByPk(brandId);
    if (!brand) return res.status(404).json({ message: "Marca no encontrada" });

    // primero ACTIVE, si no existe, devuelve el último
    let scheme = await CommissionScheme.findOne({
      where: { brand_id: brandId, status: "ACTIVE" },
      order: [["id", "DESC"]],
    });

    if (!scheme) {
      scheme = await CommissionScheme.findOne({
        where: { brand_id: brandId },
        order: [["id", "DESC"]],
      });
    }

    // 🔥 Si es STANDARD (PERCENTAGES) y está "pelado", creamos tiers base 1..5 para que la UI no quede bloqueada
    if (scheme && String(scheme.scheme_type || "").toUpperCase() === "STANDARD") {
      await ensureDefaultPercentageTiers(scheme.id);
    }

    res.json({ scheme: scheme || null });
  } catch (err) {
    next(err);
  }
}

export async function upsertBrandScheme(req, res, next) {
  try {
    const brandId = Number(req.params.brandId);
    const { scheme_type } = req.body;

    const brand = await Brand.findByPk(brandId);
    if (!brand) return res.status(404).json({ message: "Marca no encontrada" });

    // ✅ Mapeo UI -> ENUM legacy en BD
    const ui = String(scheme_type || "").toUpperCase();

    // UI: RANGES | PERCENTAGES
    // BD (ENUM actual): KIA_PLAN | STANDARD
    let type = ui;
    if (ui === "RANGES") type = "KIA_PLAN";
    if (ui === "PERCENTAGES") type = "STANDARD";

    if (!["STANDARD", "KIA_PLAN"].includes(type)) {
      return res.status(400).json({ message: "scheme_type inválido" });
    }


    // si hay scheme existente, actualiza; si no, crea uno
    let scheme = await CommissionScheme.findOne({
      where: { brand_id: brandId },
      order: [["id", "DESC"]],
    });

    if (!scheme) {
      scheme = await CommissionScheme.create({
        brand_id: brandId,
        name: `${brand.code} Scheme`,
        scheme_type: type,
        valid_from: new Date(),
        status: "ACTIVE",
        notes: null,
      });
    } else {
      scheme.scheme_type = type;
      await scheme.save();
    }

    // 🔥 Si el esquema queda en STANDARD (PERCENTAGES) y no tiene tiers, los creamos
    if (scheme && String(scheme.scheme_type || "").toUpperCase() === "STANDARD") {
      await ensureDefaultPercentageTiers(scheme.id);
    }

    res.json({ scheme });
  } catch (err) {
    next(err);
  }
}
