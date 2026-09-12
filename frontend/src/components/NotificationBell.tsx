import { useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { timeAgo } from "../hooks/useActivityFeed";

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="notification-bell">
      <button onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔{unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown-header">
            <strong>Notifications</strong>
            <button onClick={markAllRead}>Mark all read</button>
          </div>
          {notifications.length === 0 && <p className="muted">Nothing here yet.</p>}
          <ul>
            {notifications.map((n) => (
              <li key={n.id} className={n.read ? "read" : "unread"} onClick={() => !n.read && markRead(n.id)}>
                <span>{n.message}</span>
                <span className="feed-time">{timeAgo(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
