import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { BACKEND_ROOT, getTenantSlug, avisarSuspendido } from '../tenant/store';

export interface RealtimeNotification {
  id: string;
  type: 'lead_created' | 'lead_updated' | 'lead_deleted' | 'lead_assigned' | 'lead_reassigned_away' | 'message' | 'alert' | 'warning';
  title: string;
  message: string;
  timestamp: string | Date;
  read: boolean;
  severity?: 'info' | 'warning' | 'error' | 'success';
  leadId?: number;
}

interface UseRealtimeOptions {
  onLeadCreated?: (lead: any) => void;
  onLeadUpdated?: (lead: any) => void;
  onLeadDeleted?: (leadId: number) => void;
  onNotification?: (notification: RealtimeNotification) => void;
  /** Token de la sesión: el socket se (re)conecta cuando cambia. Si no se pasa, usa el de localStorage. */
  token?: string | null;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const token = options.token === undefined ? localStorage.getItem('token') : options.token;
  const slug = getTenantSlug();

  useEffect(() => {
    if (!token || !slug) return;

    // Socket.io conecta a la raíz del server, no a /api. El handshake lleva el tenant.
    const newSocket = io(BACKEND_ROOT, {
      auth: { token, tenant: slug },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket conectado');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket desconectado');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err: any) => {
      console.error('🔌 Socket error:', err.message);
    });

    // El panel de AutoAtento suspendió o dio de baja la cuenta
    newSocket.on('tenant:estado', (data: { estado: string; mensaje?: string }) => {
      if (data?.estado !== 'activo') avisarSuspendido(data?.mensaje);
    });

    newSocket.on('users:online', (userIds: number[]) => {
      setOnlineUsers(userIds);
    });

    newSocket.on('lead:created', (lead: any) => {
      console.log('📥 Lead creado:', lead);
      optionsRef.current.onLeadCreated?.(lead);
    });

    newSocket.on('lead:updated', (lead: any) => {
      console.log('📝 Lead actualizado:', lead);
      optionsRef.current.onLeadUpdated?.(lead);
    });

    newSocket.on('lead:deleted', (leadId: number) => {
      console.log('🗑️ Lead eliminado:', leadId);
      optionsRef.current.onLeadDeleted?.(leadId);
    });

    newSocket.on('notification', (notification: RealtimeNotification) => {
      setNotifications(prev => [notification, ...prev]);
      optionsRef.current.onNotification?.(notification);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, slug]);

  const emitLeadCreated = useCallback((lead: any) => {
    socket?.emit('lead:created', lead);
  }, [socket]);

  const emitLeadUpdated = useCallback((lead: any) => {
    socket?.emit('lead:updated', lead);
  }, [socket]);

  const emitLeadDeleted = useCallback((leadId: number) => {
    socket?.emit('lead:deleted', leadId);
  }, [socket]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    socket,
    isConnected,
    onlineUsers,
    notifications,
    emitLeadCreated,
    emitLeadUpdated,
    emitLeadDeleted,
    markNotificationRead,
    clearNotifications,
  };
}
