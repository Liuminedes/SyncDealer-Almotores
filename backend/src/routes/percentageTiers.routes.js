import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireBrandPermission } from "../middlewares/permissions.middleware.js";

import {
  listPercentageTiersByScheme,
  upsertPercentageTier,
  deletePercentageTier,
} from "../controllers/percentage-tiers.controller.js";

const router = Router();

// NOTA: si quieres blindar por marca, lo más limpio es validar brand por scheme.
// Por ahora lo dejamos protegido por sesión; si quieres, lo cierro con brandPermission vía query.brand.

router.get(
  "/schemes/:schemeId/percentage-tiers",
  requireAuth,
  listPercentageTiersByScheme
);

router.put(
  "/schemes/:schemeId/percentage-tiers/:tierId",
  requireAuth,
  upsertPercentageTier
);

router.delete(
  "/percentage-tiers/:id",
  requireAuth,
  deletePercentageTier
);

export default router;
