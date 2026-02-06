import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  getBrandScheme,
  upsertBrandScheme,
} from "../controllers/brand-config.controller.js";

const router = Router();

// Admin-only por ahora (efectivo y seguro)
router.get("/brands/:brandId/scheme", requireAuth, requireRole("ADMIN"), getBrandScheme);
router.put("/brands/:brandId/scheme", requireAuth, requireRole("ADMIN"), upsertBrandScheme);

export default router;
