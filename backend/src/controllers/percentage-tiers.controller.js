import { sequelize } from "../config/db.js";
import CommissionPercentageTier from "../models/CommissionPercentageTier.js";

function parsePct(v) {
  if (v === null || v === "" || typeof v === "undefined") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function listPercentageTiersByScheme(req, res, next) {
  try {
    const schemeId = Number(req.params.schemeId);

    // Listado "bonito" para UI: incluye datos del tier
    const [rows] = await sequelize.query(
      `
      SELECT
        cpt.id,
        cpt.scheme_id,
        cpt.tier_id,
        cpt.percentage,
        ct.tier_name,
        ct.min_units,
        ct.max_units,
        ct.priority
      FROM commission_percentage_tiers cpt
      JOIN commission_tiers ct ON ct.id = cpt.tier_id
      WHERE cpt.scheme_id = :schemeId
      ORDER BY ct.priority ASC, ct.min_units ASC, ct.id ASC
      `,
      { replacements: { schemeId } }
    );

    res.json({ items: rows || [] });
  } catch (err) {
    next(err);
  }
}

// Upsert por (scheme_id, tier_id)
export async function upsertPercentageTier(req, res, next) {
  try {
    const schemeId = Number(req.params.schemeId);
    const tierId = Number(req.params.tierId);

    const pct = parsePct(req.body?.percentage);
    if (pct == null) return res.status(400).json({ message: "percentage es obligatorio" });
    if (pct < 0 || pct > 100) return res.status(400).json({ message: "percentage debe estar entre 0 y 100" });

    const existing = await CommissionPercentageTier.findOne({
      where: { scheme_id: schemeId, tier_id: tierId },
    });

    if (existing) {
      existing.percentage = pct;
      await existing.save();
      return res.json({ item: existing });
    }

    const created = await CommissionPercentageTier.create({
      scheme_id: schemeId,
      tier_id: tierId,
      percentage: pct,
    });

    res.status(201).json({ item: created });
  } catch (err) {
    next(err);
  }
}

export async function deletePercentageTier(req, res, next) {
  try {
    const id = Number(req.params.id);

    const row = await CommissionPercentageTier.findByPk(id);
    if (!row) return res.status(404).json({ message: "Registro no encontrado" });

    await row.destroy();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
