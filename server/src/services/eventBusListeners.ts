import { eventBus, EVENTS } from '../utils/eventBus.js';
import { socketService } from './socketService.js';
import { logger } from '../config/logger.js';

export const initEventBusListeners = () => {
  logger.info('[EventBus] Binding asynchronous listeners to system Event Bus');

  // 1. Prediction Created listener
  eventBus.on(EVENTS.PREDICTION_CREATED, (data: { userId: string; prediction: any; healthScore: number }) => {
    logger.info(`[EventBus-Listener] Handling prediction.created for user ${data.userId}`);
    
    // Push WebSocket update to the patient
    socketService.sendToUser(data.userId, 'PREDICTION_COMPLETED', {
      prediction: data.prediction,
      healthScore: data.healthScore,
    });

    // Also broadcast stats updates to Admins who might be online!
    socketService.broadcast('ADMIN_STATS_UPDATED', {
      action: 'PREDICTION_CREATED',
      timestamp: new Date(),
    });
  });

  // 2. Lifestyle Logged listener
  eventBus.on(EVENTS.LIFESTYLE_LOGGED, (data: { userId: string; log: any; newBadges: string[] }) => {
    logger.info(`[EventBus-Listener] Handling lifestyle.logged for user ${data.userId}`);
    
    socketService.sendToUser(data.userId, 'LIFESTYLE_UPDATED', {
      log: data.log,
      newBadges: data.newBadges,
    });
  });

  // 3. Report OCR Scanned listener
  eventBus.on(EVENTS.REPORT_SCANNED, (data: { userId: string; report: any }) => {
    logger.info(`[EventBus-Listener] Handling report.scanned for user ${data.userId}`);
    
    socketService.sendToUser(data.userId, 'REPORT_PARSED', {
      report: data.report,
    });
  });

  // 4. Doctor Note Added listener
  eventBus.on(EVENTS.DOCTOR_NOTE_ADDED, (data: { patientId: string; note: any }) => {
    logger.info(`[EventBus-Listener] Handling doctor.note.added for patient ${data.patientId}`);
    
    socketService.sendToUser(data.patientId, 'NEW_DOCTOR_NOTE', {
      note: data.note,
    });
  });
};
