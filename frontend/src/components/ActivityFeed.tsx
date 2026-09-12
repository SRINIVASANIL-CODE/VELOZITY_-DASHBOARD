import { useActivityFeed, timeAgo } from "../hooks/useActivityFeed";

export default function ActivityFeed({ title = "Activity Feed" }: { title?: string }) {
  const events = useActivityFeed();

  return (
    <div className="panel">
      <h3>{title}</h3>
      {events.length === 0 && <p className="muted">No activity yet.</p>}
      <ul className="feed-list">
        {events.map((e) => (
          <li key={e.id} className="feed-item">
            <span className="feed-message">{e.message}</span>
            <span className="feed-time">{timeAgo(e.createdAt)}</span>
            {e.project && <span className="feed-project">{e.project.name}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
