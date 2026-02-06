import CommissionTier from "../models/CommissionTier.js";

export async function listSchemeTiers(req, res, next) {
  try {
    const schemeId = Number(req.params.schemeId);

    const tiers = await CommissionTier.findAll({
      where: { scheme_id: schemeId },
      order: [["priority", "ASC"], ["min_units", "ASC"], ["id", "ASC"]],
    });

    res.json({ tiers });
  } catch (err) {
    next(err);
  }
}

export async function createSchemeTier(req, res, next) {
  try {
    const schemeId = Number(req.params.schemeId);
    const { tier_name, min_units, max_units, priority } = req.body;

    const name = String(tier_name || "").trim();
    if (!name) return res.status(400).json({ message: "tier_name es obligatorio" });

    const min = Number(min_units);
    if (!min || min < 1) return res.status(400).json({ message: "min_units debe ser >= 1" });

    const max =
      max_units === null || max_units === "" || typeof max_units === "undefined"
        ? null
        : Number(max_units);

    if (max != null && max < min) {
      return res.status(400).json({ message: "max_units no puede ser menor que min_units" });
    }

    const tier = await CommissionTier.create({
      scheme_id: schemeId,
      tier_name: name,
      min_units: min,
      max_units: max,
      priority: Number(priority ?? 1),
    });

    res.status(201).json({ tier });
  } catch (err) {
    next(err);
  }
}

export async function updateTier(req, res, next) {
  try {
    const tierId = Number(req.params.tierId);
    const { tier_name, min_units, max_units, priority } = req.body;

    const tier = await CommissionTier.findByPk(tierId);
    if (!tier) return res.status(404).json({ message: "Rango no encontrado" });

    if (tier_name != null) {
      const name = String(tier_name).trim();
      if (!name) return res.status(400).json({ message: "tier_name es obligatorio" });
      tier.tier_name = name;
    }

    if (min_units != null) {
      const min = Number(min_units);
      if (!min || min < 1) return res.status(400).json({ message: "min_units debe ser >= 1" });
      tier.min_units = min;
    }

    if (max_units !== undefined) {
      const max =
        max_units === null || max_units === "" ? null : Number(max_units);

      if (max != null && max < tier.min_units) {
        return res.status(400).json({ message: "max_units no puede ser menor que min_units" });
      }
      tier.max_units = max;
    }

    if (priority != null) tier.priority = Number(priority);

    await tier.save();
    res.json({ tier });
  } catch (err) {
    next(err);
  }
}

export async function deleteTier(req, res, next) {
  try {
    const tierId = Number(req.params.tierId);

    const tier = await CommissionTier.findByPk(tierId);
    if (!tier) return res.status(404).json({ message: "Rango no encontrado" });

    await tier.destroy();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
