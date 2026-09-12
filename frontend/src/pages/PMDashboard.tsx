import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ActivityFeed from "../components/ActivityFeed";
import { Project, Task } from "../types";

export default function PMDashboard() {
  const [data, setData] = useState<{ projects: Project[]; tasksByPriority: Record<string, number>; upcomingDueDates: Task[] } | null>(null);

  useEffect(() => {
    api.get("/dashboard").then((res) => setData(res.data));
  }, []);

  return (
    <div className="dashboard">
      <h2>Project Manager Dashboard</h2>
      <div className="dashboard-grid">
        <div className="panel">
          <h3>Your Projects</h3>
          <ul className="project-list">
            {data?.projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`}>{p.name}</Link>
                <span className="muted"> · {p._count?.tasks ?? 0} tasks</span>
              </li>
            ))}
          </ul>

          <h3>Tasks by Priority</h3>
          <ul>
            {data && Object.entries(data.tasksByPriority).map(([p, c]) => (
              <li key={p}>{p}: {c}</li>
            ))}
          </ul>

          <h3>Due This Week</h3>
          <ul>
            {data?.upcomingDueDates.map((t) => (
              <li key={t.id}>{t.title} — {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}</li>
            ))}
            {data?.upcomingDueDates.length === 0 && <li className="muted">Nothing due this week.</li>}
          </ul>
        </div>
        <ActivityFeed title="Your Projects' Activity" />
      </div>
    </div>
  );
}
