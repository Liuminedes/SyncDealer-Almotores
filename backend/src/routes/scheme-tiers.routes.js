import { Router }      from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  listSchemeTiers,
  createSchemeTier,
  updateTier,
  deleteTier,
} from "../controllers/scheme-tiers.controller.js";

const router = Router();

const BRAND_OP = ["ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"];

router.get   ("/schemes/:schemeId/tiers",  requireAuth, requireRole(...BRAND_OP), listSchemeTiers);
router.post  ("/schemes/:schemeId/tiers",  requireAuth, requireRole(...BRAND_OP), createSchemeTier);
router.put   ("/tiers/:tierId",            requireAuth, requireRole(...BRAND_OP), updateTier);
router.delete("/tiers/:tierId",            requireAuth, requireRole("ADMIN"),     deleteTier);

export default router;