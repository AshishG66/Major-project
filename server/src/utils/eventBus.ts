import { EventEmitter } from 'events';
import { logger } from '../config/logger.js';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Allow up to 20 listeners per event type
    this.setMaxListeners(20);
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    logger.info(`[EventBus] Emitting event: ${String(event)}`);
    return super.emit(event, ...args);
  }
}

export const eventBus = new EventBus();

// Strongly typed event names constant
export const EVENTS = {
  PREDICTION_CREATED: 'prediction.created',
  LIFESTYLE_LOGGED: 'lifestyle.logged',
  REPORT_SCANNED: 'report.scanned',
  DOCTOR_NOTE_ADDED: 'doctor.note.added',
  REMINDER_TRIGGERED: 'reminder.triggered',
};
