import { Router } from "express";
import * as projectController from "../controllers/projectController";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createProjectSchema } from "../utils/validators";
import { Role } from "@prisma/client";

const router = Router();
router.use(requireAuth);

// All three roles can list/view — the service layer scopes *which* projects each sees.
router.get("/", projectController.listProjects);
router.get("/:id", projectController.getProject);

// Only Admin and PM may create projects, per the access table.
router.post("/", requireRole(Role.ADMIN, Role.PROJECT_MANAGER), validate(createProjectSchema), projectController.createProject);

export default router;
