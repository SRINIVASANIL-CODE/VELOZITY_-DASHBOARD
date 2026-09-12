import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Task } from "../types";
import TaskFilters from "./TaskFilters";

export default function TaskList({ projectId, canUpdate }: { projectId?: string; canUpdate?: boolean }) {
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const query: Record<string, string> = {};
    for (const key of ["status", "priority", "dueBefore", "dueAfter"]) {
      const v = params.get(key);
      if (v) query[key] = v;
    }
    if (projectId) query.projectId = projectId;
    const res = await api.get("/tasks", { params: query });
    setTasks(res.data.tasks);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString(), projectId]);

  async function updateStatus(id: string, status: string) {
    await api.patch(`/tasks/${id}/status`, { status });
    load();
  }

  return (
    <div className="panel">
      <TaskFilters />
      {loading ? (
        <p className="muted">Loading tasks…</p>
      ) : (
        <table className="task-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className={t.isOverdue ? "overdue-row" : ""}>
                <td>{t.title}{t.isOverdue && <span className="overdue-tag">Overdue</span>}</td>
                <td>{t.assignee?.name ?? "Unassigned"}</td>
                <td>{t.priority}</td>
                <td>
                  {canUpdate ? (
                    <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  ) : (
                    t.status.replace("_", " ")
                  )}
                </td>
                <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan={5} className="muted">No tasks match these filters.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
