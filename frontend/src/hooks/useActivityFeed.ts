import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { ActivityEvent } from "../types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export { timeAgo };

// Loads the last 20 events on mount, then stays live via the socket. On reconnect
// (e.g. laptop woke from sleep, or a dropped WiFi connection), it re-fetches only the
// events created after the last one it already has — the "missed while offline" catch-up
// the brief requires, sourced from the DB rather than any client-side cache.
export function useActivityFeed() {
  const socket = useSocket();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const latestTimestamp = useRef<string | null>(null);

  const mergeNew = useCallback((incoming: ActivityEvent[]) => {
    if (incoming.length === 0) return;
    setEvents((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const fresh = incoming.filter((e) => !existingIds.has(e.id));
      const merged = [...fresh, ...prev].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return merged.slice(0, 100);
    });
    const newest = incoming[incoming.length - 1];
    if (newest && (!latestTimestamp.current || newest.createdAt > latestTimestamp.current)) {
      latestTimestamp.current = incoming.reduce((max, e) => (e.createdAt > max ? e.createdAt : max), incoming[0].createdAt);
    }
  }, []);

  useEffect(() => {
    api.get("/activity").then((res) => {
      const initial: ActivityEvent[] = res.data.events;
      setEvents(initial);
      if (initial.length > 0) latestTimestamp.current = initial[0].createdAt;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    function onNew(event: ActivityEvent) {
      mergeNew([event]);
    }

    async function catchUp() {
      if (!latestTimestamp.current) return;
      const res = await api.get("/activity", { params: { since: latestTimestamp.current } });
      mergeNew(res.data.events);
    }

    socket.on("activity:new", onNew);
    socket.on("connect", catchUp); // fires on initial connect AND every reconnect

    return () => {
      socket.off("activity:new", onNew);
      socket.off("connect", catchUp);
    };
  }, [socket, mergeNew]);

  return events;
}
