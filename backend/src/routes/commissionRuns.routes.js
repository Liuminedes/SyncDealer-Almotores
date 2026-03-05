import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireBrandPermission } from "../middlewares/permissions.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  listRunsSchema,
  runIdParamSchema,
  calculateRunSchema,
  updateRunStatusSchema,
} from "../validators/commissions.schema.js";

import {
  listRuns,
  getRunById,
  calculateRun,
  updateRunStatus,
  deleteRun,
} from "../controllers/commissionRuns.controller.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireBrandPermission("view", (req) => req.query.brand),
  validate(listRunsSchema),
  listRuns
);

router.get(
  "/:id",
  requireAuth,
  requireBrandPermission("view", (req) => req.query.brand),
  validate(runIdParamSchema),
  getRunById
);

router.post(
  "/calculate",
  requireAuth,
  requireBrandPermission("generate", (req) => req.query.brand),
  validate(calculateRunSchema),
  calculateRun
);

router.patch(
  "/:id/status",
  requireAuth,
  requireBrandPermission("generate", (req) => req.query.brand),
  validate(updateRunStatusSchema),
  updateRunStatus
);

// DELETE — solo DRAFT y CALCULATED
router.delete(
  "/:id",
  requireAuth,
  requireBrandPermission("generate", (req) => req.query.brand),
  validate(runIdParamSchema),
  deleteRun
);

export default router;