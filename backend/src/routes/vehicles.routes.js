import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";

import * as VehiclesController from "../controllers/vehicles.controller.js";

const router = Router();

/**
 * Vehicles CRUD (Sprint 5)
 * Nota: lo dejo restringido a ADMIN para proteger catálogo/valores.
 * Si quieres abrirlo a BRAND_MANAGER luego, lo agregamos sin tocar el resto.
 */
router.get("/", requireAuth, requireRole("ADMIN"), VehiclesController.list);
router.get("/:id", requireAuth, requireRole("ADMIN"), VehiclesController.getById);

router.post("/", requireAuth, requireRole("ADMIN"), VehiclesController.create);
router.put("/:id", requireAuth, requireRole("ADMIN"), VehiclesController.update);

router.patch("/:id/status", requireAuth, requireRole("ADMIN"), VehiclesController.setStatus);

export default router;
