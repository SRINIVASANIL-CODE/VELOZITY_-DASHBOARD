export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  managerId: string;
  client?: { id: string; name: string };
  manager?: { id: string; name: string; email: string };
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  assigneeId?: string | null;
  assignee?: { id: string; name: string } | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  isOverdue: boolean;
  project?: { id: string; name: string; managerId?: string };
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  taskId?: string | null;
  actorId: string;
  actor: { id: string; name: string };
  task?: { id: string; title: string } | null;
  project?: { id: string; name: string };
  fromStatus?: TaskStatus | null;
  toStatus?: TaskStatus | null;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  taskId?: string | null;
  type: "TASK_ASSIGNED" | "TASK_MOVED_TO_REVIEW";
  message: string;
  read: boolean;
  createdAt: string;
}
