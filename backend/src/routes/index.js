import { Router } from "express";

import authRoutes from "./auth.routes.js";
import brandsRoutes from "./brands.routes.js";
import branchesRoutes from "./branches.routes.js";
import commissionSchemesRoutes from "./commissionSchemes.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/brands", brandsRoutes);
router.use("/branches", branchesRoutes);
router.use("/commission-schemes", commissionSchemesRoutes);

export default router;
