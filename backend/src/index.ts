import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { initSockets } from "./sockets";
import { startOverdueJob } from "./jobs/overdueJob";

import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import activityRoutes from "./routes/activity.routes";
import notificationRoutes from "./routes/notification.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import metaRoutes from "./routes/meta.routes";

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/meta", metaRoutes);

// Must be registered last — Express only routes here once no route matched or a
// handler called next(err). This is the single place error responses are shaped.
app.use(errorHandler);

const server = http.createServer(app);
initSockets(server);
startOverdueJob();

server.listen(env.port, () => {
  console.log(`API + WebSocket server listening on :${env.port}`);
});
