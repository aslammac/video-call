"use client";
import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import io, { Socket } from "socket.io-client";

interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const socket = useMemo(() => io("http://backend:3001"), []);

  useEffect(() => {
    return () => {
      socket.close();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export default SocketProvider;
