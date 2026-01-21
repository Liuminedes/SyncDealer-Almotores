import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import { listRoles } from "../controllers/roles.controller.js";

const router = Router();

// Solo ADMIN (si quieres abrirlo a más roles, se cambia fácil)
router.get("/", requireAuth, requireRole("ADMIN"), listRoles);

export default router;
