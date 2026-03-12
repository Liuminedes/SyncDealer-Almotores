import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  requireRole,
  requireBrandOpForAdvisor,
} from "../middlewares/permissions.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  setUserStatus,
  getUserBrands,
  replaceUserBrands,
  listAdvisorsForBrandOp,
  updateAdvisorVacationOnly,
} from "../controllers/users.controller.js";

import {
  listUsersSchema,
  userIdParamSchema,
  createUserSchema,
  updateUserSchema,
  setStatusSchema,
  replaceUserBrandsSchema,
} from "../validators/users.schema.js";

const router = Router();

// ── Rutas exclusivas ADMIN ─────────────────────────────────────────────────
router.get(   "/",           requireAuth, requireRole("ADMIN"), validate(listUsersSchema),        listUsers);
router.get(   "/:id",        requireAuth, requireRole("ADMIN"), validate(userIdParamSchema),       getUserById);
router.post(  "/",           requireAuth, requireRole("ADMIN"), validate(createUserSchema),        createUser);
router.put(   "/:id",        requireAuth, requireRole("ADMIN"), validate(updateUserSchema),        updateUser);
router.patch( "/:id/status", requireAuth, requireRole("ADMIN"), validate(setStatusSchema),         setUserStatus);
router.get(   "/:id/brands", requireAuth, requireRole("ADMIN"), validate(userIdParamSchema),       getUserBrands);
router.put(   "/:id/brands", requireAuth, requireRole("ADMIN"), validate(replaceUserBrandsSchema), replaceUserBrands);

// ── Rutas ASSISTANT_SALES / BRAND_MANAGER ─────────────────────────────────
// Solo pueden ver asesores de su propia marca y modificar únicamente vacaciones

// GET /api/users/brand-advisors — lista asesores de su marca
router.get(
  "/brand-advisors",
  requireAuth,
  requireRole("ASSISTANT_SALES", "BRAND_MANAGER"),
  listAdvisorsForBrandOp
);

// PATCH /api/users/:id/vacation — toggle de vacaciones de un asesor de su marca
router.patch(
  "/:id/vacation",
  requireAuth,
  requireRole("ASSISTANT_SALES", "BRAND_MANAGER"),
  requireBrandOpForAdvisor(),
  updateAdvisorVacationOnly
);

export default router;