import { Router } from "express";
import * as taskController from "../controllers/taskController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate, validateQuery } from "../middleware/validate";
import { createTaskSchema, taskQuerySchema, updateTaskStatusSchema } from "../utils/validators";
import { Role } from "@prisma/client";

const router = Router();
router.use(requireAuth);

router.get("/", validateQuery(taskQuerySchema), taskController.listTasks);
router.post("/", requireRole(Role.ADMIN, Role.PROJECT_MANAGER), validate(createTaskSchema), taskController.createTask);

// Any role can hit this route — the service layer enforces "PM: only own projects,
// Developer: only own tasks" at the data level, per the brief's explicit requirement
// that this can't be bypassed by hitting the endpoint directly with a modified token.
router.patch("/:id/status", validate(updateTaskStatusSchema), taskController.updateTaskStatus);

export default router;
