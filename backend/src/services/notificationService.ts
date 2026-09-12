import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { AuthUser } from "./projectService";

export async function listNotifications(user: AuthUser) {
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function unreadCount(user: AuthUser) {
  return prisma.notification.count({ where: { userId: user.id, read: false } });
}

export async function markRead(user: AuthUser, notificationId: string) {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif || notif.userId !== user.id) throw new AppError(404, "Notification not found", "NOT_FOUND");
  return prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
}

export async function markAllRead(user: AuthUser) {
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  return unreadCount(user);
}
