import { asyncHandler } from "../utils/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import * as notificationService from "../services/notificationService";

export const listNotifications = asyncHandler(async (req: AuthedRequest, res) => {
  const [notifications, unread] = await Promise.all([
    notificationService.listNotifications(req.user!),
    notificationService.unreadCount(req.user!),
  ]);
  res.json({ notifications, unreadCount: unread });
});

export const markRead = asyncHandler(async (req: AuthedRequest, res) => {
  await notificationService.markRead(req.user!, req.params.id);
  const unread = await notificationService.unreadCount(req.user!);
  res.json({ unreadCount: unread });
});

export const markAllRead = asyncHandler(async (req: AuthedRequest, res) => {
  const unread = await notificationService.markAllRead(req.user!);
  res.json({ unreadCount: unread });
});
