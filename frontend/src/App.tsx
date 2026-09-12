import { Navigate, Route, Routes, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import PMDashboard from "./pages/PMDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import ProjectDetail from "./pages/ProjectDetail";
import NotificationBell from "./components/NotificationBell";

function RoleDashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "PROJECT_MANAGER") return <PMDashboard />;
  return <DeveloperDashboard />;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">Velozity Dashboard</Link>
        <div className="header-right">
          <span className="muted">{user.name} · {user.role.replace("_", " ")}</span>
          <NotificationBell />
          <button onClick={logout}>Log out</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <SocketProvider>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<ProtectedLayout><RoleDashboard /></ProtectedLayout>} />
        <Route path="/projects/:id" element={<ProtectedLayout><ProjectDetail /></ProtectedLayout>} />
      </Routes>
    </SocketProvider>
  );
}
