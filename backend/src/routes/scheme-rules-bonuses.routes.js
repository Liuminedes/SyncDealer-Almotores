import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  listRules, createRule, updateRule, deleteRule,
  listBonuses, createBonus, updateBonus, deleteBonus,
} from "../controllers/scheme-rules-bonuses.controller.js";

const router = Router();

// Reglas
router.get   ("/schemes/:schemeId/rules",           requireAuth, requireRole("ADMIN"), listRules);
router.post  ("/schemes/:schemeId/rules",           requireAuth, requireRole("ADMIN"), createRule);
router.put   ("/schemes/:schemeId/rules/:ruleId",   requireAuth, requireRole("ADMIN"), updateRule);
router.delete("/schemes/:schemeId/rules/:ruleId",   requireAuth, requireRole("ADMIN"), deleteRule);

// Bonos
router.get   ("/schemes/:schemeId/bonuses",              requireAuth, requireRole("ADMIN"), listBonuses);
router.post  ("/schemes/:schemeId/bonuses",              requireAuth, requireRole("ADMIN"), createBonus);
router.put   ("/schemes/:schemeId/bonuses/:bonusId",     requireAuth, requireRole("ADMIN"), updateBonus);
router.delete("/schemes/:schemeId/bonuses/:bonusId",     requireAuth, requireRole("ADMIN"), deleteBonus);

export default router;