import { prisma } from "../config/prisma";
import { Role, TaskStatus } from "@prisma/client";
import { AuthUser } from "./projectService";

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export function renderStatusChangeMessage(actorName: string, taskTitle: string, from: TaskStatus, to: TaskStatus) {
  return `${actorName} moved "${taskTitle}" from ${STATUS_LABEL[from]} \u2192 ${STATUS_LABEL[to]}`;
}

// The `where` clause that scopes activity-feed reads to a role:
//  - Admin:   everything, global feed
//  - PM:      only events on projects they manage
//  - Developer: only events on tasks assigned to them
export function activityVisibilityWhere(user: AuthUser) {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.PROJECT_MANAGER) return { project: { managerId: user.id } };
  return { task: { assigneeId: user.id } };
}

// Catch-up feed: the last 20 events this user is entitled to see, read straight from
// the database (never from an in-memory buffer, so it survives server restarts and
// works for a user who reconnects on a different server instance).
export async function getRecentActivity(user: AuthUser, limit = 20) {
  return prisma.activityEvent.findMany({
    where: activityVisibilityWhere(user),
    include: {
      actor: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Same query, but only events after a given timestamp — used when a client reconnects
// with "I was last online at X" so it only receives what it actually missed.
export async function getActivitySince(user: AuthUser, since: Date, limit = 100) {
  return prisma.activityEvent.findMany({
    where: { ...activityVisibilityWhere(user), createdAt: { gt: since } },
    include: {
      actor: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}
