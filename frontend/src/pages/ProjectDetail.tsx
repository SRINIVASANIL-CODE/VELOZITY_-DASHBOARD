import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import TaskList from "../components/TaskList";
import { Project } from "../types";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (id) api.get(`/projects/${id}`).then((res) => setProject(res.data.project));
  }, [id]);

  if (!project) return <p className="muted">Loading…</p>;

  return (
    <div className="dashboard">
      <h2>{project.name}</h2>
      <p className="muted">{project.client?.name} · Managed by {project.manager?.name}</p>
      <TaskList projectId={project.id} canUpdate={user?.role !== "ADMIN" ? true : true} />
    </div>
  );
}
