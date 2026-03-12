import { Router }      from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as controller from "../controllers/sales.controller.js";
 
const router = Router();
 
router.use(requireAuth); // ← todas las rutas requieren token
 
router.get("/",      controller.list);
router.get("/:id",   controller.getById);
router.post("/",     controller.create);
router.put("/:id",   controller.update);
 
export default router;