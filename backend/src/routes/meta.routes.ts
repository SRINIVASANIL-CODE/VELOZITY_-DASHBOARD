import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { Role } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";

// Small helper endpoints the frontend needs for dropdowns (clients, developers to
// assign, PMs for the admin project-creation form). Kept out of project/task routes
// to avoid overloading those resource routers with unrelated lookups.
const router = Router();
router.use(requireAuth);

router.get("/clients", asyncHandler(async (_req, res) => {
  res.json({ clients: await prisma.client.findMany({ orderBy: { name: "asc" } }) });
}));

router.get(
  "/developers",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  asyncHandler(async (_req, res) => {
    res.json({
      developers: await prisma.user.findMany({
        where: { role: Role.DEVELOPER },
        select: { id: true, name: true, email: true },
      }),
    });
  })
);

export default router;
