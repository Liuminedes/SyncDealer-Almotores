import { Router } from "express";

import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import rolesRoutes from "./roles.routes.js";
import brandsRoutes from "./brands.routes.js";
import branchesRoutes from "./branches.routes.js";
import commissionSchemesRoutes from "./commissionSchemes.routes.js";
import vehiclesRoutes from "./vehicles.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/roles", rolesRoutes);
router.use("/brands", brandsRoutes);
router.use("/branches", branchesRoutes);
router.use("/commission-schemes", commissionSchemesRoutes);
router.use("/vehicles", vehiclesRoutes);

export default router;
