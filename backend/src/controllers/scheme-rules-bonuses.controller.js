import SchemeRule from "../models/SchemeRule.js";
import SchemeBonus from "../models/SchemeBonus.js";
import CommissionScheme from "../models/CommissionScheme.js";
import { validateConditions } from "../utils/policyEngine.js";
import { HttpError } from "../utils/httpError.js";

function assertScheme(scheme) {
  if (!scheme) throw new HttpError(404, "Scheme no encontrado");
}

// ─── RULES ────────────────────────────────────────────────────────────────────

export async function listRules(req, res, next) {
  try {
    const scheme = await CommissionScheme.findByPk(req.params.schemeId);
    assertScheme(scheme);

    const rules = await SchemeRule.findAll({
      where: { scheme_id: scheme.id },
      order: [["priority", "DESC"], ["id", "ASC"]],
    });

    // Parsear conditions si llega como string
    const data = rules.map((r) => {
      const raw = r.toJSON();
      if (typeof raw.conditions === "string") {
        try { raw.conditions = JSON.parse(raw.conditions); } catch { raw.conditions = []; }
      }
      return raw;
    });

    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function createRule(req, res, next) {
  try {
    const scheme = await CommissionScheme.findByPk(req.params.schemeId);
    assertScheme(scheme);

    const { name, description, conditions, effect_type, effect_value, is_active, priority, notes } = req.body;

    if (!name?.trim()) throw new HttpError(400, "El nombre es obligatorio");
    if (!["FORCE_TIER", "FIXED_ADD", "FIXED_SUBTRACT"].includes(effect_type))
      throw new HttpError(400, "effect_type inválido");
    if (!effect_value?.toString().trim()) throw new HttpError(400, "effect_value es obligatorio");
    if (effect_type !== "FORCE_TIER" && isNaN(Number(effect_value)))
      throw new HttpError(400, "effect_value debe ser numérico para efectos monetarios");
    if (effect_type !== "FORCE_TIER" && Number(effect_value) <= 0)
      throw new HttpError(400, "El monto debe ser mayor a 0");

    try { validateConditions(conditions, "rule"); }
    catch (e) { throw new HttpError(400, e.message); }

    const rule = await SchemeRule.create({
      scheme_id:    scheme.id,
      name:         name.trim(),
      description:  description?.trim() || null,
      conditions,
      effect_type,
      effect_value: String(effect_value).trim(),
      is_active:    is_active !== undefined ? Boolean(is_active) : true,
      priority:     Number(priority ?? 0),
      notes:        notes?.trim() || null,
    });

    res.status(201).json({ ok: true, data: rule });
  } catch (err) { next(err); }
}

export async function updateRule(req, res, next) {
  try {
    const rule = await SchemeRule.findByPk(req.params.ruleId);
    if (!rule) throw new HttpError(404, "Regla no encontrada");

    const { name, description, conditions, effect_type, effect_value, is_active, priority, notes } = req.body;

    if (name !== undefined) {
      if (!name?.trim()) throw new HttpError(400, "El nombre no puede estar vacío");
      rule.name = name.trim();
    }
    if (description !== undefined) rule.description = description?.trim() || null;
    if (notes !== undefined) rule.notes = notes?.trim() || null;
    if (is_active !== undefined) rule.is_active = Boolean(is_active);
    if (priority !== undefined) rule.priority = Number(priority);

    if (effect_type !== undefined) {
      if (!["FORCE_TIER", "FIXED_ADD", "FIXED_SUBTRACT"].includes(effect_type))
        throw new HttpError(400, "effect_type inválido");
      rule.effect_type = effect_type;
    }
    if (effect_value !== undefined) {
      if (!effect_value?.toString().trim()) throw new HttpError(400, "effect_value es obligatorio");
      rule.effect_value = String(effect_value).trim();
    }
    if (conditions !== undefined) {
      try { validateConditions(conditions, "rule"); }
      catch (e) { throw new HttpError(400, e.message); }
      rule.conditions = conditions;
    }

    await rule.save();
    res.json({ ok: true, data: rule });
  } catch (err) { next(err); }
}

export async function deleteRule(req, res, next) {
  try {
    const rule = await SchemeRule.findByPk(req.params.ruleId);
    if (!rule) throw new HttpError(404, "Regla no encontrada");
    await rule.destroy();
    res.json({ ok: true, message: "Regla eliminada" });
  } catch (err) { next(err); }
}

// ─── BONUSES ──────────────────────────────────────────────────────────────────

export async function listBonuses(req, res, next) {
  try {
    const scheme = await CommissionScheme.findByPk(req.params.schemeId);
    assertScheme(scheme);

    const bonuses = await SchemeBonus.findAll({
      where: { scheme_id: scheme.id },
      order: [["priority", "DESC"], ["id", "ASC"]],
    });

    const data = bonuses.map((b) => {
      const raw = b.toJSON();
      if (typeof raw.conditions === "string") {
        try { raw.conditions = JSON.parse(raw.conditions); } catch { raw.conditions = []; }
      }
      return raw;
    });

    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function createBonus(req, res, next) {
  try {
    const scheme = await CommissionScheme.findByPk(req.params.schemeId);
    assertScheme(scheme);

    const { name, description, conditions, bonus_amount, is_active, priority, notes } = req.body;

    if (!name?.trim()) throw new HttpError(400, "El nombre es obligatorio");
    if (!Number.isFinite(Number(bonus_amount)) || Number(bonus_amount) <= 0)
      throw new HttpError(400, "bonus_amount debe ser un número mayor a 0");

    try { validateConditions(conditions, "bonus"); }
    catch (e) { throw new HttpError(400, e.message); }

    const bonus = await SchemeBonus.create({
      scheme_id:    scheme.id,
      name:         name.trim(),
      description:  description?.trim() || null,
      conditions,
      bonus_amount: Number(bonus_amount),
      is_active:    is_active !== undefined ? Boolean(is_active) : true,
      priority:     Number(priority ?? 0),
      notes:        notes?.trim() || null,
    });

    res.status(201).json({ ok: true, data: bonus });
  } catch (err) { next(err); }
}

export async function updateBonus(req, res, next) {
  try {
    const bonus = await SchemeBonus.findByPk(req.params.bonusId);
    if (!bonus) throw new HttpError(404, "Bono no encontrado");

    const { name, description, conditions, bonus_amount, is_active, priority, notes } = req.body;

    if (name !== undefined) {
      if (!name?.trim()) throw new HttpError(400, "El nombre no puede estar vacío");
      bonus.name = name.trim();
    }
    if (description !== undefined) bonus.description = description?.trim() || null;
    if (notes !== undefined) bonus.notes = notes?.trim() || null;
    if (is_active !== undefined) bonus.is_active = Boolean(is_active);
    if (priority !== undefined) bonus.priority = Number(priority);
    if (bonus_amount !== undefined) {
      if (!Number.isFinite(Number(bonus_amount)) || Number(bonus_amount) <= 0)
        throw new HttpError(400, "bonus_amount debe ser mayor a 0");
      bonus.bonus_amount = Number(bonus_amount);
    }
    if (conditions !== undefined) {
      try { validateConditions(conditions, "bonus"); }
      catch (e) { throw new HttpError(400, e.message); }
      bonus.conditions = conditions;
    }

    await bonus.save();
    res.json({ ok: true, data: bonus });
  } catch (err) { next(err); }
}

export async function deleteBonus(req, res, next) {
  try {
    const bonus = await SchemeBonus.findByPk(req.params.bonusId);
    if (!bonus) throw new HttpError(404, "Bono no encontrado");
    await bonus.destroy();
    res.json({ ok: true, message: "Bono eliminado" });
  } catch (err) { next(err); }
}