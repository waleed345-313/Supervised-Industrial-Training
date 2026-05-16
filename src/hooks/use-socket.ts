import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/api';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token) return;

    const newSocket: Socket = io(API_BASE, { auth: { token } });
    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  return socket;
}
