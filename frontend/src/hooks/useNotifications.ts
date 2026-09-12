import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { Notification } from "../types";

export function useNotifications() {
  const socket = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get("/notifications").then((res) => {
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    // Badge count updates live via the socket, never by polling — per the brief.
    function onNotification(payload: { notification: Notification; unreadCount: number }) {
      setNotifications((prev) => [payload.notification, ...prev]);
      setUnreadCount(payload.unreadCount);
    }
    socket.on("notification:new", onNotification);
    return () => {
      socket.off("notification:new", onNotification);
    };
  }, [socket]);

  async function markRead(id: string) {
    const res = await api.patch(`/notifications/${id}/read`);
    setUnreadCount(res.data.unreadCount);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllRead() {
    const res = await api.patch("/notifications/read-all");
    setUnreadCount(res.data.unreadCount);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return { notifications, unreadCount, markRead, markAllRead };
}
