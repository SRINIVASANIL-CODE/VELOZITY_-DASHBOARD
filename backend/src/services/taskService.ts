import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { AuthUser, getProjectOrThrow } from "./projectService";
import { renderStatusChangeMessage } from "./activityService";

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueBefore?: Date;
  dueAfter?: Date;
  projectId?: string;
}

// Data-level scoping for task lists, mirroring projectVisibilityWhere: a Developer's
// query can only ever match rows where they are the assignee, no matter what filters
// are passed in the query string.
export function taskVisibilityWhere(user: AuthUser) {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.PROJECT_MANAGER) return { project: { managerId: user.id } };
  return { assigneeId: user.id };
}

export async function listTasks(user: AuthUser, filters: TaskFilters) {
  return prisma.task.findMany({
    where: {
      ...taskVisibilityWhere(user),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.dueBefore || filters.dueAfter
        ? { dueDate: { ...(filters.dueAfter ? { gte: filters.dueAfter } : {}), ...(filters.dueBefore ? { lte: filters.dueBefore } : {}) } }
        : {}),
    },
    include: {
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, managerId: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
}

export async function createTask(
  user: AuthUser,
  data: { projectId: string; title: string; description?: string; assigneeId?: string; priority?: TaskPriority; dueDate?: Date }
) {
  // Throws 403/404 if this user isn't allowed to touch the project at all.
  const project = await getProjectOrThrow(data.projectId, user);
  if (user.role === Role.DEVELOPER) {
    throw new AppError(403, "Developers cannot create tasks", "FORBIDDEN");
  }
  if (user.role === Role.PROJECT_MANAGER && project.managerId !== user.id) {
    throw new AppError(403, "You do not manage this project", "FORBIDDEN");
  }

  const task = await prisma.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      priority: data.priority ?? TaskPriority.MEDIUM,
      dueDate: data.dueDate,
    },
  });

  let notification = null;
  if (data.assigneeId) {
    notification = await prisma.notification.create({
      data: {
        userId: data.assigneeId,
        taskId: task.id,
        type: "TASK_ASSIGNED",
        message: `You were assigned to "${task.title}"`,
      },
    });
  }

  return { task, notification };
}

// The core write path called out in the brief: status change + activity log entry +
// (conditionally) a notification, all inside one transaction so the log can never
// drift from what actually happened to the task.
export async function updateTaskStatus(user: AuthUser, taskId: string, newStatus: TaskStatus) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) throw new AppError(404, "Task not found", "NOT_FOUND");

  if (user.role === Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
    throw new AppError(403, "You do not manage this project", "FORBIDDEN");
  }
  if (user.role === Role.DEVELOPER && task.assigneeId !== user.id) {
    throw new AppError(403, "You can only update your own tasks", "FORBIDDEN");
  }

  const fromStatus = task.status;

  // Note: `tx` is typed `any` here only because this sandbox can't download the Prisma
  // engine binary to generate `Prisma.TransactionClient`; running `npx prisma generate`
  // in a normal environment resolves this to full transaction-client typing.
  const [updatedTask, activityEvent, notification] = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: { status: newStatus, isOverdue: newStatus === "DONE" ? false : task.isOverdue },
    });

    const actor = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    const event = await tx.activityEvent.create({
      data: {
        projectId: task.projectId,
        taskId: task.id,
        actorId: user.id,
        fromStatus,
        toStatus: newStatus,
        message: renderStatusChangeMessage(actor.name, task.title, fromStatus, newStatus),
      },
    });

    let notif = null;
    if (newStatus === "IN_REVIEW") {
      notif = await tx.notification.create({
        data: {
          userId: task.project.managerId,
          taskId: task.id,
          type: "TASK_MOVED_TO_REVIEW",
          message: `"${task.title}" was moved to In Review`,
        },
      });
    }

    return [updated, event, notif] as const;
  });

  return { task: updatedTask, activityEvent, notification, project: task.project };
}
