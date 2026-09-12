import { asyncHandler } from "../utils/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import * as taskService from "../services/taskService";
import * as notificationService from "../services/notificationService";
import { emitActivityEvent, emitNotification } from "../sockets";

export const listTasks = asyncHandler(async (req: AuthedRequest, res) => {
  const { status, priority, projectId, dueBefore, dueAfter } = req.query as Record<string, string | undefined>;
  const tasks = await taskService.listTasks(req.user!, {
    status: status as any,
    priority: priority as any,
    projectId,
    dueBefore: dueBefore ? new Date(dueBefore) : undefined,
    dueAfter: dueAfter ? new Date(dueAfter) : undefined,
  });
  res.json({ tasks });
});

export const createTask = asyncHandler(async (req: AuthedRequest, res) => {
  const { task, notification } = await taskService.createTask(req.user!, req.body);
  if (notification) {
    const count = await notificationService.unreadCount({ id: notification.userId, role: req.user!.role });
    emitNotification(notification.userId, notification, count);
  }
  res.status(201).json({ task });
});

export const updateTaskStatus = asyncHandler(async (req: AuthedRequest, res) => {
  const { status } = req.body;
  const { task, activityEvent, notification, project } = await taskService.updateTaskStatus(req.user!, req.params.id, status);

  emitActivityEvent({
    event: activityEvent,
    projectManagerId: project.managerId,
    assigneeId: task.assigneeId,
  });

  if (notification) {
    const count = await notificationService.unreadCount({ id: notification.userId, role: req.user!.role });
    emitNotification(notification.userId, notification, count);
  }

  res.json({ task });
});
