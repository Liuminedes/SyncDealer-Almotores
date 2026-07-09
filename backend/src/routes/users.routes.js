// backend/src/routes/users.routes.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import { uploadExcel }  from "../middlewares/vehicles.import.middleware.js";
import * as UsersController from "../controllers/users.controller.js";
import { importUsers, downloadUsersTemplate } from "../controllers/users.import.controller.js";

const router  = Router();
const WRITERS = ["ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"];

// ── Importación PRIMERO (antes de /:id) ───────────────────────────────────────
router.get( "/import/template", requireAuth, requireRole(...WRITERS), downloadUsersTemplate);
router.post("/import",          requireAuth, requireRole(...WRITERS), uploadExcel.single("file"), importUsers);

// ── Asesores por BrandOp ──────────────────────────────────────────────────────
router.get("/brand-advisors", requireAuth, requireRole("ASSISTANT_SALES", "BRAND_MANAGER"), UsersController.listAdvisorsForBrandOp);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get("/",    requireAuth, requireRole("ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"), UsersController.listUsers);
router.get("/:id", requireAuth, requireRole("ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"), UsersController.getUserById);
router.post("/",   requireAuth, requireRole("ADMIN"), UsersController.createUser);
router.put("/:id", requireAuth, requireRole("ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"), UsersController.updateUser);
router.patch("/:id/status", requireAuth, requireRole("ADMIN"), UsersController.setUserStatus);

// Marcas del usuario
router.get("/:id/brands", requireAuth, requireRole("ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"), UsersController.getUserBrands);
router.put("/:id/brands",  requireAuth, requireRole("ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"), UsersController.replaceUserBrands);

export default router;