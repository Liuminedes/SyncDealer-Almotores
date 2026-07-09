import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  getBrandScheme,
  upsertBrandScheme,
} from "../controllers/brand-config.controller.js";

const router = Router();

const BRAND_OP = ["ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"];

// GET: admin y brandOp pueden leer el esquema de su marca
router.get("/brands/:brandId/scheme", requireAuth, requireRole(...BRAND_OP), getBrandScheme);
// PUT: solo admin puede cambiar el tipo de motor (RANGES ↔ PERCENTAGES)
router.put("/brands/:brandId/scheme", requireAuth, requireRole("ADMIN"), upsertBrandScheme);

export default router;