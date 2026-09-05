import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../services/api';

export const useWebSockets = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token || !userId) {
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }
      return;
    }

    let wsHost = 'hridayadarpana-api.onrender.com';
    let protocol = 'wss:';

    try {
      if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
        const u = new URL(API_BASE_URL);
        wsHost = u.host;
        protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      } else if (typeof window !== 'undefined') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal) {
          wsHost = 'localhost:5000';
          protocol = 'ws:';
        } else {
          wsHost = window.location.host;
          protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        }
      }
    } catch {
      wsHost = import.meta.env.DEV ? 'localhost:5000' : 'hridayadarpana-api.onrender.com';
      protocol = import.meta.env.DEV ? 'ws:' : 'wss:';
    }

    const wsUrl = `${protocol}//${wsHost}/?token=${token}`;
    let isCleanedUp = false;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isCleanedUp) {
          console.log('[WebSocket] Client registered successfully with', wsHost);
        }
      };

      ws.onmessage = (event) => {
        if (isCleanedUp) return;
        try {
          const packet = JSON.parse(event.data);
          const { type, payload } = packet;

          if (type === 'PREDICTION_COMPLETED') {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['predictionHistory'] });
          } else if (type === 'LIFESTYLE_UPDATED') {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['lifestyleLogs'] });
          } else if (type === 'NEW_DOCTOR_NOTE') {
            queryClient.invalidateQueries({ queryKey: ['patientNotes'] });
          } else if (type === 'REPORT_PARSED') {
            queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
          }
        } catch (err) {
          console.warn('[WebSocket] Error parsing message packet:', err);
        }
      };

      ws.onclose = () => {
        // Closed normally
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Connection unavailable, falling back to REST APIs');
      };
    } catch (e) {
      console.warn('[WebSocket] Failed to initialize WebSocket:', e);
    }

    return () => {
      isCleanedUp = true;
      if (ws) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      socketRef.current = null;
    };
  }, [isAuthenticated, token, userId, queryClient]);
};
