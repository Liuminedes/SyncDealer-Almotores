// backend/src/routes/sales.routes.js
// CAMBIOS: +GET /import/template  +POST /import/preview  +POST /import/confirm
import { Router }      from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { uploadExcel } from "../middlewares/vehicles.import.middleware.js";
import * as controller from "../controllers/sales.controller.js";
import * as importCtrl from "../controllers/sales.import.controller.js";

const router = Router();
router.use(requireAuth);

// ── Importación PRIMERO (antes de /:id) ───────────────────────────────────────
router.get( "/import/template", importCtrl.downloadTemplate);
router.post("/import/preview",  uploadExcel.single("file"), importCtrl.previewImport);
router.post("/import/confirm",  uploadExcel.single("file"), importCtrl.confirmImport);

// ── CRUD + eliminación masiva ─────────────────────────────────────────────────
router.get("/",        controller.list);
router.get("/:id",     controller.getById);
router.post("/",       controller.create);
router.put("/:id",     controller.update);
router.delete("/bulk", controller.removeBulk);
router.delete("/:id",  controller.remove);

export default router;
