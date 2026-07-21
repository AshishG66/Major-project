import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

export const useWebSockets = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, token, user } = useAuthStore();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      return;
    }

    const wsUrl = `ws://localhost:5000/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Client registered successfully');
    };

    ws.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        console.log('[WebSocket] Packet received:', packet);

        const { type, payload } = packet;

        // Invalidate react-query cache structures dynamically based on message headers
        if (type === 'PREDICTION_COMPLETED') {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['predictionHistory'] });
          alert(`✨ Vitals Scan Complete: Your Cardio Risk level is assessed as ${payload.prediction.riskLevel}!`);
        } 
        
        else if (type === 'LIFESTYLE_UPDATED') {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['lifestyleLogs'] });
          
          if (payload.newBadges && payload.newBadges.length > 0) {
            alert(`🏆 New Achievement Unlocked: ${payload.newBadges.join(', ')}!`);
          }
        } 
        
        else if (type === 'NEW_DOCTOR_NOTE') {
          queryClient.invalidateQueries({ queryKey: ['patientNotes'] });
          alert(`📋 New clinical note added by Dr. ${payload.note.doctor?.profile?.lastName || 'Specialist'}: "${payload.note.note}"`);
        } 
        
        else if (type === 'REPORT_PARSED') {
          queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
          alert(`📄 Document "${payload.report.title}" has been successfully parsed by Gemini OCR.`);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message packet:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WebSocket] Connection closed');
    };

    ws.onerror = (err) => {
      console.error('[WebSocket] Socket encountered error:', err);
    };

    return () => {
      ws.close();
    };
  }, [isAuthenticated, token, user, queryClient]);
};
