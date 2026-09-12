import { prisma } from "../config/prisma";
import { Role } from "@prisma/client";
import { AuthUser } from "./projectService";
import { taskVisibilityWhere } from "./taskService";
import { projectVisibilityWhere } from "./projectService";

export async function adminDashboard(onlineCount: number) {
  const [totalProjects, statusCounts, overdueCount] = await Promise.all([
    prisma.project.count(),
    prisma.task.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.task.count({ where: { isOverdue: true } }),
  ]);
  return {
    totalProjects,
    tasksByStatus: Object.fromEntries(statusCounts.map((s: { status: string; _count: { status: number } }) => [s.status, s._count.status])),
    overdueCount,
    onlineCount,
  };
}

export async function pmDashboard(user: AuthUser) {
  const projectWhere = projectVisibilityWhere(user);
  const [projects, priorityCounts, upcoming] = await Promise.all([
    prisma.project.findMany({ where: projectWhere, include: { _count: { select: { tasks: true } } } }),
    prisma.task.groupBy({ by: ["priority"], where: { project: projectWhere }, _count: { priority: true } }),
    prisma.task.findMany({
      where: {
        project: projectWhere,
        dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  return {
    projects,
    tasksByPriority: Object.fromEntries(priorityCounts.map((p: { priority: string; _count: { priority: number } }) => [p.priority, p._count.priority])),
    upcomingDueDates: upcoming,
  };
}

export async function developerDashboard(user: AuthUser) {
  const tasks = await prisma.task.findMany({
    where: taskVisibilityWhere(user),
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    include: { project: { select: { id: true, name: true } } },
  });
  return { tasks };
}
