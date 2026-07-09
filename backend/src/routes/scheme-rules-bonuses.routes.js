import { Router }      from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  listRules, createRule, updateRule, deleteRule,
  listBonuses, createBonus, updateBonus, deleteBonus,
} from "../controllers/scheme-rules-bonuses.controller.js";

const router = Router();

const BRAND_OP = ["ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"];

router.get   ("/schemes/:schemeId/rules",           requireAuth, requireRole(...BRAND_OP), listRules);
router.post  ("/schemes/:schemeId/rules",           requireAuth, requireRole(...BRAND_OP), createRule);
router.put   ("/schemes/:schemeId/rules/:ruleId",   requireAuth, requireRole(...BRAND_OP), updateRule);
router.delete("/schemes/:schemeId/rules/:ruleId",   requireAuth, requireRole("ADMIN"),     deleteRule);

router.get   ("/schemes/:schemeId/bonuses",              requireAuth, requireRole(...BRAND_OP), listBonuses);
router.post  ("/schemes/:schemeId/bonuses",              requireAuth, requireRole(...BRAND_OP), createBonus);
router.put   ("/schemes/:schemeId/bonuses/:bonusId",     requireAuth, requireRole(...BRAND_OP), updateBonus);
router.delete("/schemes/:schemeId/bonuses/:bonusId",     requireAuth, requireRole("ADMIN"),     deleteBonus);

export default router;