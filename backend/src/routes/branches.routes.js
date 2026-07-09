import { Router }      from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  listBranches, getBranchById,
  createBranch, updateBranch, deleteBranch,
} from "../controllers/branches.controller.js";

const router = Router();

// Lectura: todos los roles autenticados (se usa en Users, Ventas, etc.)
router.get("/",    requireAuth, listBranches);
router.get("/:id", requireAuth, getBranchById);

// Escritura: solo ADMIN
router.post("/",    requireAuth, requireRole("ADMIN"), createBranch);
router.put("/:id",  requireAuth, requireRole("ADMIN"), updateBranch);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteBranch);

export default router;