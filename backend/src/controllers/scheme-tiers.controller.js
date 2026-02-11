// backend/src/controllers/scheme-tiers.controller.js
import CommissionTier from "../models/CommissionTier.js";

function parsePercent(v) {
  if (v === null || v === "" || typeof v === "undefined") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function assertPercentInRange(pct) {
  if (pct != null && (pct < 0 || pct > 100)) {
    const err = new Error("rate_percent debe estar entre 0 y 100");
    err.statusCode = 400;
    throw err;
  }
}

export async function listSchemeTiers(req, res, next) {
  try {
    const schemeId = Number(req.params.schemeId);

    const tiers = await CommissionTier.findAll({
      where: { scheme_id: schemeId },
      order: [
        ["priority", "ASC"],
        ["min_units", "ASC"],
        ["id", "ASC"],
      ],
    });

    res.json({ tiers });
  } catch (err) {
    next(err);
  }
}

export async function createSchemeTier(req, res, next) {
  try {
    const schemeId = Number(req.params.schemeId);
    const { tier_name, min_units, max_units, priority, rate_percent } = req.body;

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

    const pct = parsePercent(rate_percent);
    assertPercentInRange(pct);

    const tier = await CommissionTier.create({
      scheme_id: schemeId,
      tier_name: name,
      min_units: min,
      max_units: max,
      priority: Number(priority ?? 1),
      rate_percent: pct, // ✅ Sequelize lo guarda en commission_rate_percent por el field mapping
    });

    res.status(201).json({ tier });
  } catch (err) {
    // Manejo estándar de error 400 desde assertPercentInRange
    if (err?.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

export async function updateTier(req, res, next) {
  try {
    const tierId = Number(req.params.tierId);
    const { tier_name, min_units, max_units, priority, rate_percent } = req.body;

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
      const max = max_units === null || max_units === "" ? null : Number(max_units);
      if (max != null && max < tier.min_units) {
        return res.status(400).json({ message: "max_units no puede ser menor que min_units" });
      }
      tier.max_units = max;
    }

    if (priority != null) tier.priority = Number(priority);

    if (rate_percent !== undefined) {
      const pct = parsePercent(rate_percent);
      assertPercentInRange(pct);
      tier.rate_percent = pct; // ✅ guarda en commission_rate_percent por el mapping
    }

    await tier.save();
    res.json({ tier });
  } catch (err) {
    if (err?.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
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
