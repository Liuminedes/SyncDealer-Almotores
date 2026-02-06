import { Router } from "express";

import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import rolesRoutes from "./roles.routes.js";
import brandsRoutes from "./brands.routes.js";
import branchesRoutes from "./branches.routes.js";
import commissionRunsRoutes from "./commissionRuns.routes.js";
import commissionSchemesRoutes from "./commissionSchemes.routes.js";
import vehiclesRoutes from "./vehicles.routes.js";
import salesRoutes from "./sales.routes.js";

// ✅ NUEVAS RUTAS (configuración de marca y tiers)
import brandConfigRoutes from "./brand-config.routes.js";
import schemeTiersRoutes from "./scheme-tiers.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/roles", rolesRoutes);
router.use("/brands", brandsRoutes);
router.use("/branches", branchesRoutes);
router.use("/commission-runs", commissionRunsRoutes);
router.use("/commission-schemes", commissionSchemesRoutes);
router.use("/vehicles", vehiclesRoutes);
router.use("/sales", salesRoutes);

// ✅ Montar nuevas rutas bajo /api
// OJO: estas rutas YA incluyen paths completos: /brands/:id/scheme, /schemes/:id/tiers, /tiers/:id
router.use(brandConfigRoutes);
router.use(schemeTiersRoutes);

export default router;
