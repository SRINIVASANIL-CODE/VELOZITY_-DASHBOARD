import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  role: Role;
}

// Builds the Prisma `where` clause that scopes a project list to what this user is
// allowed to see. This is the data-level enforcement layer that sits underneath the
// route-level requireRole() gate — a PM token can never fetch another PM's project
// row even though the route itself is open to any authenticated PM.
export function projectVisibilityWhere(user: AuthUser) {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.PROJECT_MANAGER) return { managerId: user.id };
  // Developer: visible only through projects containing a task assigned to them.
  return { tasks: { some: { assigneeId: user.id } } };
}

export async function listProjects(user: AuthUser) {
  return prisma.project.findMany({
    where: projectVisibilityWhere(user),
    include: {
      client: true,
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectOrThrow(projectId: string, user: AuthUser) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true, manager: { select: { id: true, name: true, email: true } } },
  });
  if (!project) throw new AppError(404, "Project not found", "NOT_FOUND");

  if (user.role === Role.ADMIN) return project;
  if (user.role === Role.PROJECT_MANAGER) {
    if (project.managerId !== user.id) {
      throw new AppError(403, "You do not manage this project", "FORBIDDEN");
    }
    return project;
  }
  // Developer: must have at least one assigned task in this project.
  const hasTask = await prisma.task.findFirst({ where: { projectId, assigneeId: user.id } });
  if (!hasTask) throw new AppError(403, "You do not have access to this project", "FORBIDDEN");
  return project;
}

export async function createProject(user: AuthUser, data: { name: string; description?: string; clientId: string; managerId?: string }) {
  // Admin may assign any PM as manager; a PM creating a project is always its own manager.
  const managerId = user.role === Role.ADMIN && data.managerId ? data.managerId : user.id;
  return prisma.project.create({
    data: { name: data.name, description: data.description, clientId: data.clientId, managerId },
  });
}
