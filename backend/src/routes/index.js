import { Router } from "express";

import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import rolesRoutes from "./roles.routes.js";
import brandsRoutes from "./brands.routes.js"
;import branchesRouter from "./branches.routes.js";
import commissionRunsRoutes from "./commissionRuns.routes.js";
import commissionSchemesRoutes from "./commissionSchemes.routes.js";
import vehiclesRoutes from "./vehicles.routes.js";
import salesRoutes from "./sales.routes.js";
import brandConfigRoutes from "./brand-config.routes.js";
import schemeTiersRoutes from "./scheme-tiers.routes.js";
import percentageTiersRoutes from "./percentageTiers.routes.js";
import schemeRulesBonusesRoutes from "./scheme-rules-bonuses.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/roles", rolesRoutes);
router.use("/brands", brandsRoutes);
router.use("/branches", branchesRouter);
router.use("/commission-runs", commissionRunsRoutes);
router.use("/commission-schemes", commissionSchemesRoutes);
router.use("/vehicles", vehiclesRoutes);
router.use("/sales", salesRoutes);

router.use(brandConfigRoutes);
router.use(schemeTiersRoutes);
router.use(percentageTiersRoutes);
router.use(schemeRulesBonusesRoutes);

export default router;
