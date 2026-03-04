import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { listBranches, getBranchById } from "../controllers/branches.controller.js";

const router = Router();

router.get("/",    requireAuth, listBranches);
router.get("/:id", requireAuth, getBranchById);

export default router;