import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  listSchemeTiers,
  createSchemeTier,
  updateTier,
  deleteTier,
} from "../controllers/scheme-tiers.controller.js";

const router = Router();

router.get("/schemes/:schemeId/tiers", requireAuth, requireRole("ADMIN"), listSchemeTiers);
router.post("/schemes/:schemeId/tiers", requireAuth, requireRole("ADMIN"), createSchemeTier);

router.put("/tiers/:tierId", requireAuth, requireRole("ADMIN"), updateTier);
router.delete("/tiers/:tierId", requireAuth, requireRole("ADMIN"), deleteTier);

export default router;
