import { Router }      from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
  listExportable,
  downloadZip,
  sendToHRBulk,
  downloadSinglePdf,
} from "../controllers/exports.controller.js";

const router = Router();
const ALLOWED = ["ADMIN", "ASSISTANT_SALES", "BRAND_MANAGER"];

// Listar corridas ASST_VALIDATED listas para exportar
router.get("/",              requireAuth, requireRole(...ALLOWED), listExportable);
// Descargar PDF individual (también el asesor puede descargar el suyo)
router.get("/:id/pdf",       requireAuth, downloadSinglePdf);
// Descargar ZIP masivo
router.post("/zip",          requireAuth, requireRole(...ALLOWED), downloadZip);
// Enviar por email a RRHH + marcar SENT_TO_HR
router.post("/send-to-hr",   requireAuth, requireRole(...ALLOWED), sendToHRBulk);

export default router;