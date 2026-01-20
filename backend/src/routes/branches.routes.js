import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { listBranches } from "../controllers/branches.controller.js";

const router = Router();

router.get("/", requireAuth, listBranches);

export default router;
