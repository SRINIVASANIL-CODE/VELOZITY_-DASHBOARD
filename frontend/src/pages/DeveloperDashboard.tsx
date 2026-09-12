import { useEffect, useState } from "react";
import { api } from "../api/client";
import ActivityFeed from "../components/ActivityFeed";
import { Task } from "../types";

export default function DeveloperDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);

  async function load() {
    const res = await api.get("/dashboard");
    setTasks(res.data.tasks);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    await api.patch(`/tasks/${id}/status`, { status });
    load();
  }

  return (
    <div className="dashboard">
      <h2>My Tasks</h2>
      <div className="dashboard-grid">
        <div className="panel">
          <table className="task-table">
            <thead>
              <tr><th>Title</th><th>Project</th><th>Priority</th><th>Status</th><th>Due</th></tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className={t.isOverdue ? "overdue-row" : ""}>
                  <td>{t.title}{t.isOverdue && <span className="overdue-tag">Overdue</span>}</td>
                  <td>{t.project?.name}</td>
                  <td>{t.priority}</td>
                  <td>
                    <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </td>
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan={5} className="muted">No tasks assigned to you.</td></tr>}
            </tbody>
          </table>
        </div>
        <ActivityFeed title="Activity On Your Tasks" />
      </div>
    </div>
  );
}
