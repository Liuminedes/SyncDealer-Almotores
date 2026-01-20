import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { listMyBrands } from "../controllers/brands.controller.js";

const router = Router();

router.get("/", requireAuth, listMyBrands);

export default router;
