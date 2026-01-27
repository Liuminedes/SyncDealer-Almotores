import { Router } from "express";
import * as controller from "../controllers/sales.controller.js";

const router = Router();

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);

export default router;
