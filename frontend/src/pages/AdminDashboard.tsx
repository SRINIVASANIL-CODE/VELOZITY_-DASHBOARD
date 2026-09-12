import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import ActivityFeed from "../components/ActivityFeed";
import TaskList from "../components/TaskList";

interface AdminStats {
  totalProjects: number;
  tasksByStatus: Record<string, number>;
  overdueCount: number;
  onlineCount: number;
}

export default function AdminDashboard() {
  const socket = useSocket();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    api.get("/dashboard").then((res) => setStats(res.data));
  }, []);

  useEffect(() => {
    if (!socket) return;
    function onPresence(payload: { onlineCount: number }) {
      setStats((prev) => (prev ? { ...prev, onlineCount: payload.onlineCount } : prev));
    }
    socket.on("presence:count", onPresence);
    return () => {
      socket.off("presence:count", onPresence);
    };
  }, [socket]);

  return (
    <div className="dashboard">
      <h2>Admin Dashboard</h2>
      {stats && (
        <div className="stat-cards">
          <div className="stat-card"><span className="stat-value">{stats.totalProjects}</span><span>Total Projects</span></div>
          <div className="stat-card"><span className="stat-value">{stats.overdueCount}</span><span>Overdue Tasks</span></div>
          <div className="stat-card"><span className="stat-value">{stats.onlineCount}</span><span>Users Online</span></div>
          {Object.entries(stats.tasksByStatus).map(([status, count]) => (
            <div className="stat-card" key={status}><span className="stat-value">{count}</span><span>{status.replace("_", " ")}</span></div>
          ))}
        </div>
      )}
      <div className="dashboard-grid">
        <TaskList canUpdate />
        <ActivityFeed title="Global Activity Feed" />
      </div>
    </div>
  );
}
