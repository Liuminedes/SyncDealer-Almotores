import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireBrandPermission } from "../middlewares/permissions.middleware.js";
import { listSchemesByBrand } from "../controllers/commissionSchemes.controller.js";

const router = Router();

// GET /api/commission-schemes?brand=KIA
router.get(
  "/",
  requireAuth,
  requireBrandPermission("view", (req) => req.query.brand),
  listSchemesByBrand
);

export default router;
