import CommissionScheme from "../models/CommissionScheme.js";
import Brand from "../models/Brand.js";

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

    res.json({ scheme });
  } catch (err) {
    next(err);
  }
}
