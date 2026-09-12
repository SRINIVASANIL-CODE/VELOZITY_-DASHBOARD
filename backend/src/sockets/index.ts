import { Server, Socket } from "socket.io";
import http from "http";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";
import { Role } from "@prisma/client";

interface SocketUser {
  id: string;
  role: Role;
}

// Tracks how many live sockets each user currently has open, so presence survives
// a user having multiple tabs and only drops to "offline" when the last one closes.
const onlineSockets = new Map<string, number>();

let ioRef: Server | null = null;

export function initSockets(server: http.Server) {
  const io = new Server(server, {
    cors: { origin: env.clientOrigin, credentials: true },
  });
  ioRef = io;

  // Auth happens once, at the handshake, using the same short-lived access token as
  // the REST API — no separate socket-only credential to keep in sync.
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing token"));
      const payload = verifyAccessToken(token);
      (socket.data as { user: SocketUser }).user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket.data as { user: SocketUser }).user;

    // Personal room — used for notification badge pushes, independent of role feed.
    socket.join(`user:${user.id}`);

    // Role-scoped activity feed room. This mirrors activityVisibilityWhere() on the
    // REST side exactly, so "what you'd get via catchup" and "what you get live" are
    // always the same rule expressed twice, once as a DB filter and once as a room.
    if (user.role === Role.ADMIN) {
      socket.join("feed:admin");
    } else if (user.role === Role.PROJECT_MANAGER) {
      socket.join(`feed:pm:${user.id}`);
    } else {
      socket.join(`feed:dev:${user.id}`);
    }

    const count = (onlineSockets.get(user.id) ?? 0) + 1;
    onlineSockets.set(user.id, count);
    if (count === 1) broadcastPresence(io);

    socket.on("disconnect", () => {
      const remaining = (onlineSockets.get(user.id) ?? 1) - 1;
      if (remaining <= 0) {
        onlineSockets.delete(user.id);
        broadcastPresence(io);
      } else {
        onlineSockets.set(user.id, remaining);
      }
    });
  });

  return io;
}

function broadcastPresence(io: Server) {
  io.to("feed:admin").emit("presence:count", { onlineCount: onlineSockets.size });
}

export function getOnlineCount() {
  return onlineSockets.size;
}

export function getIO(): Server {
  if (!ioRef) throw new Error("Socket.io not initialized");
  return ioRef;
}

// Fan-out for one activity event: admins always get it (global feed), the owning PM
// gets it for any activity in a project they manage, and the assigned developer gets
// it if the task belongs to them. A single DB write results in at most 3 room emits.
export function emitActivityEvent(payload: {
  event: unknown;
  projectManagerId: string;
  assigneeId?: string | null;
}) {
  const io = getIO();
  io.to("feed:admin").emit("activity:new", payload.event);
  io.to(`feed:pm:${payload.projectManagerId}`).emit("activity:new", payload.event);
  if (payload.assigneeId) {
    io.to(`feed:dev:${payload.assigneeId}`).emit("activity:new", payload.event);
  }
}

export function emitNotification(userId: string, notification: unknown, unreadCount: number) {
  const io = getIO();
  io.to(`user:${userId}`).emit("notification:new", { notification, unreadCount });
}
