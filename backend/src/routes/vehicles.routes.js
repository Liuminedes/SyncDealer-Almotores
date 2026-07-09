// backend/src/routes/vehicles.routes.js  — CAMBIOS: +POST /import  +GET /import/template
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import { uploadExcel }  from "../middlewares/vehicles.import.middleware.js";
import * as VC from "../controllers/vehicles.controller.js";

const router  = Router();
const WRITERS = ["ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"];
const READERS = ["ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"];

// Rutas de importación PRIMERO (antes de /:id) para evitar conflicto de rutas
router.get("/import/template", requireAuth, requireRole(...WRITERS), VC.downloadTemplate);
router.post("/import", requireAuth, requireRole(...WRITERS), uploadExcel.single("file"), VC.importVehicles);

// CRUD
router.get("/",           requireAuth, requireRole(...READERS), VC.list);
router.get("/:id",        requireAuth, requireRole(...READERS), VC.getById);
router.post("/",          requireAuth, requireRole(...WRITERS), VC.create);
router.put("/:id",        requireAuth, requireRole(...WRITERS), VC.update);
router.patch("/:id/status", requireAuth, requireRole(...WRITERS), VC.setStatus);

export default router;
