import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getAccessToken } from "../api/client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    // Authenticate the socket handshake with the same access token used for REST
    // calls. If the token has rotated (post-refresh), reconnect picks up the new one.
    const s = io(API_URL, { auth: { token: getAccessToken() }, withCredentials: true });
    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
