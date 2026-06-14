'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001/ws`;
  }
  return 'http://localhost:3001/ws';
}

const WS_URL = typeof window !== 'undefined' ? getWsUrl() : 'http://localhost:3001/ws';

interface UseSocketOptions {
  storeId: string;
  role?: string;
  tableId?: string;
}

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  on: (event: string, callback: (data: any) => void) => (() => void) | undefined;
  emit: (event: string, data: any) => void;
}

export function useSocket({ storeId, role, tableId }: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);

      // Join store room
      if (role) {
        socket.emit('join:store', { storeId, role });
      }

      // Join table room (for customer)
      if (tableId) {
        socket.emit('join:table', { storeId, tableId });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [storeId, role, tableId]);

  const on = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  };

  const emit = (event: string, data: any) => {
    socketRef.current?.emit(event, data);
  };

  return { socket: socketRef.current, connected, on, emit };
}
