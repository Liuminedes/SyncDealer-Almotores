import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/permissions.middleware.js";
import {
    listVacations,
    createVacation,
    updateVacation,
    deleteVacation,
} from "../controllers/advisorVacations.controller.js";

const router = Router({ mergeParams: true }); // mergeParams para heredar :advisorId

router.use(requireAuth, requireRole("ADMIN"));

router.get("/", listVacations);
router.post("/", createVacation);
router.put("/:id", updateVacation);
router.delete("/:id", deleteVacation);

export default router;