import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  listMyBrands,
  adminListBrands,
  adminCreateBrand,
  adminUpdateBrand,
  adminGetBrandById,
} from "../controllers/brands.controller.js";

const router = Router();

// ✅ existente (NO se toca)
router.get("/", requireAuth, listMyBrands);

// ✅ nuevos (solo ADMIN)
router.get("/admin", requireAuth, requireRole("ADMIN"), adminListBrands);

// ✅ NUEVO: detalle de marca (solo ADMIN)
router.get("/:id", requireAuth, requireRole("ADMIN"), adminGetBrandById);

router.post("/", requireAuth, requireRole("ADMIN"), adminCreateBrand);
router.put("/:id", requireAuth, requireRole("ADMIN"), adminUpdateBrand);

export default router;
