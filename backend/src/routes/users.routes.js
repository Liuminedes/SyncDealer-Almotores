import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  setUserStatus,
  getUserBrands,
  replaceUserBrands,
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

// ✅ Solo ADMIN gestiona usuarios
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", validate(listUsersSchema), listUsers);
router.get("/:id", validate(userIdParamSchema), getUserById);

router.post("/", validate(createUserSchema), createUser);
router.put("/:id", validate(updateUserSchema), updateUser);

router.patch("/:id/status", validate(setStatusSchema), setUserStatus);

router.get("/:id/brands", validate(userIdParamSchema), getUserBrands);
router.put("/:id/brands", validate(replaceUserBrandsSchema), replaceUserBrands);

export default router;
