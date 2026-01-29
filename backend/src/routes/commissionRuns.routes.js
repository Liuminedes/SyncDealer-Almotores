// backend/src/routes/commissionRuns.routes.js
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
} from "../controllers/commissionRuns.controller.js";

const router = Router();

// GET /api/commission-runs?brand=KIA
router.get(
  "/",
  requireAuth,
  requireBrandPermission("view", (req) => req.query.brand),
  validate(listRunsSchema),
  listRuns
);

// GET /api/commission-runs/:id?brand=KIA
router.get(
  "/:id",
  requireAuth,
  requireBrandPermission("view", (req) => req.query.brand),
  validate(runIdParamSchema),
  getRunById
);

// POST /api/commission-runs/calculate?brand=KIA
router.post(
  "/calculate",
  requireAuth,
  requireBrandPermission("generate", (req) => req.query.brand),
  validate(calculateRunSchema),
  calculateRun
);

// PATCH /api/commission-runs/:id/status?brand=KIA
router.patch(
  "/:id/status",
  requireAuth,
  requireBrandPermission("generate", (req) => req.query.brand),
  validate(updateRunStatusSchema),
  updateRunStatus
);

export default router;
