import { Router } from "express";
import { requireAuth }            from "../middlewares/auth.middleware.js";
import {
  requireBrandPermission,
  requireOwnAdvisor,
} from "../middlewares/permissions.middleware.js";
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
  getRunByIdAdvisor,
  calculateRun,
  updateRunStatus,
  deleteRun,
  advisorApproveRun,
  advisorRejectRun,
  asstValidateRun,
  sendToHR,
  listMyRuns,
} from "../controllers/commissionRuns.controller.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS ASESOR — sin ?brand=, van PRIMERO para evitar conflicto con /:id
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/commission-runs/my
router.get("/my",     requireAuth, requireOwnAdvisor(), listMyRuns);

// GET  /api/commission-runs/my/:id  ← fix "Marca requerida"
router.get("/my/:id", requireAuth, requireOwnAdvisor(), getRunByIdAdvisor);

// POST /api/commission-runs/:id/advisor-approve
router.post("/:id/advisor-approve", requireAuth, requireOwnAdvisor(), advisorApproveRun);

// POST /api/commission-runs/:id/advisor-reject  { note }
router.post("/:id/advisor-reject",  requireAuth, requireOwnAdvisor(), advisorRejectRun);

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS ADMIN / BRAND_OP — requieren ?brand=
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/commission-runs?brand=KIA
router.get(
  "/",
  requireAuth,
  requireBrandPermission("view", (req) => req.query.brand),
  validate(listRunsSchema),
  listRuns
);

// GET  /api/commission-runs/:id?brand=KIA
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

// POST /api/commission-runs/:id/validate?brand=KIA
router.post(
  "/:id/validate",
  requireAuth,
  requireBrandPermission("generate", (req) => req.query.brand),
  asstValidateRun
);

// POST /api/commission-runs/:id/send-to-hr?brand=KIA
router.post(
  "/:id/send-to-hr",
  requireAuth,
  requireBrandPermission("generate", (req) => req.query.brand),
  sendToHR
);

// DELETE /api/commission-runs/:id?brand=KIA
router.delete(
  "/:id",
  requireAuth,
  requireBrandPermission("generate", (req) => req.query.brand),
  validate(runIdParamSchema),
  deleteRun
);

export default router;