import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';
import { isDoctorAssignedToPatient } from './accessControlService.js';

export interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  role?: string;
  isAlive?: boolean;
}

class SocketService {
  private wss: WebSocketServer | null = null;
  private userSockets: Map<string, Set<AuthenticatedSocket>> = new Map();
  // Room subscriptions mapping patientId -> Set of sockets authorized to receive that patient's events
  private patientSubscriptions: Map<string, Set<AuthenticatedSocket>> = new Map();
  private customAuthorizer: ((doctorId: string, patientId: string) => Promise<boolean>) | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  setAuthorizer(fn: ((doctorId: string, patientId: string) => Promise<boolean>) | null) {
    this.customAuthorizer = fn;
  }

  init(server: Server) {
    this.wss = new WebSocketServer({ server });
    logger.info('[WebSocket] WebSocket Broker initialized successfully');

    this.wss.on('connection', (ws: AuthenticatedSocket, req) => {
      ws.isAlive = true;

      // Extract JWT authentication token from URL query parameters (e.g. ws://localhost:5000/?token=xxxx)
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        logger.warn('[WebSocket] Connection rejected: No authentication token provided');
        ws.close(4001, 'Unauthorized');
        return;
      }

      let resolvedUserId: string | null = null;
      let resolvedRole: string = 'USER';

      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'hridyadarpan_super_secret_jwt_key_2026';
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
        if (!decoded || !decoded.id) {
          throw new Error('Malformed token payload');
        }
        resolvedUserId = decoded.id;
        resolvedRole = decoded.role || 'USER';
      } catch (err: any) {
        logger.warn(`[WebSocket] Connection rejected due to invalid token: ${err.message}`);
        ws.close(4001, 'Unauthorized');
        return;
      }

      ws.userId = resolvedUserId;
      ws.role = resolvedRole;
      
      // Store connection in userSockets
      if (!this.userSockets.has(resolvedUserId)) {
        this.userSockets.set(resolvedUserId, new Set());
      }
      this.userSockets.get(resolvedUserId)!.add(ws);

      logger.info(`[WebSocket] User ${resolvedUserId} (${resolvedRole}) connected. Total sockets for user: ${this.userSockets.get(resolvedUserId)!.size}`);

      // Handle heartbeat check pings
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle client messages (e.g. SUBSCRIBE_PATIENT, UNSUBSCRIBE_PATIENT)
      ws.on('message', async (data) => {
        try {
          const raw = data.toString();
          const parsed = JSON.parse(raw);
          if (parsed.action === 'SUBSCRIBE_PATIENT' && parsed.patientId) {
            await this.subscribeToPatient(ws, parsed.patientId);
          } else if (parsed.action === 'UNSUBSCRIBE_PATIENT' && parsed.patientId) {
            this.unsubscribeFromPatient(ws, parsed.patientId);
          }
        } catch (err: any) {
          logger.warn(`[WebSocket] Malformed message from user ${ws.userId}: ${err.message}`);
        }
      });

      ws.on('close', () => {
        this.removeSocket(resolvedUserId!, ws);
        logger.info(`[WebSocket] User ${resolvedUserId} socket disconnected`);
      });

      ws.on('error', (err) => {
        logger.error(`[WebSocket] Error for user ${resolvedUserId}: ${err.message}`);
        this.removeSocket(resolvedUserId!, ws);
      });
    });

    // Start heartbeat monitor interval
    this.heartbeatTimer = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws: AuthenticatedSocket) => {
        if (ws.isAlive === false) {
          logger.warn(`[WebSocket] Closing dead socket for user ${ws.userId}`);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    this.heartbeatTimer.unref?.();
  }

  close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.userSockets.clear();
    this.patientSubscriptions.clear();
  }


  private removeSocket(userId: string, ws: AuthenticatedSocket) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Clean up from all patient subscriptions
    for (const [patientId, subs] of this.patientSubscriptions.entries()) {
      if (subs.has(ws)) {
        subs.delete(ws);
        if (subs.size === 0) {
          this.patientSubscriptions.delete(patientId);
        }
      }
    }
  }

  /**
   * Subscribes an authenticated socket to a patient's event room.
   * Verifies explicit clinical authorization:
   * - Patient self-subscription (ws.userId === patientId): allowed
   * - Admin (ws.role === 'ADMIN'): allowed under audit
   * - Doctor (ws.role === 'DOCTOR'): strictly requires active DoctorPatientAssignment
   */
  async subscribeToPatient(
    ws: AuthenticatedSocket,
    patientId: string,
    customAuthorizer?: (doctorId: string, patientId: string) => Promise<boolean>
  ): Promise<boolean> {
    if (!ws.userId || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    let isAuthorized = false;

    if (ws.userId === patientId) {
      isAuthorized = true;
    } else if (ws.role === 'ADMIN') {
      isAuthorized = true;
    } else if (ws.role === 'DOCTOR') {
      try {
        const checkFn = customAuthorizer || this.customAuthorizer || isDoctorAssignedToPatient;
        isAuthorized = await checkFn(ws.userId, patientId);
      } catch (err: any) {
        logger.error(`[WebSocket] Authorization check failed for doctor ${ws.userId} -> patient ${patientId}: ${err.message}`);
        isAuthorized = false;
      }
    }

    if (!isAuthorized) {
      logger.warn(`[WebSocket] Unauthorized patient room subscription attempt: User ${ws.userId} (${ws.role}) -> Patient ${patientId}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'SUBSCRIPTION_DENIED',
          patientId,
          message: 'Access denied. You do not have an active clinical assignment for this patient.',
        }));
      }
      return false;
    }

    if (!this.patientSubscriptions.has(patientId)) {
      this.patientSubscriptions.set(patientId, new Set());
    }
    this.patientSubscriptions.get(patientId)!.add(ws);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SUBSCRIPTION_CONFIRMED',
        patientId,
        message: 'Successfully subscribed to clinical events for patient.',
      }));
    }

    logger.info(`[WebSocket] User ${ws.userId} successfully subscribed to patient room ${patientId}`);
    return true;
  }

  unsubscribeFromPatient(ws: AuthenticatedSocket, patientId: string) {
    const subs = this.patientSubscriptions.get(patientId);
    if (subs) {
      subs.delete(ws);
      if (subs.size === 0) {
        this.patientSubscriptions.delete(patientId);
      }
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'UNSUBSCRIBED',
        patientId,
      }));
    }
  }

  /**
   * Immediately terminates a doctor's subscription to a patient's room upon assignment revocation.
   * Clears cached room membership and emits a revocation notice to the affected doctor.
   * Does NOT disconnect the doctor's general socket or other patient sessions.
   */
  revokePatientAuthorization(doctorId: string, patientId: string): number {
    let revokedCount = 0;
    const subs = this.patientSubscriptions.get(patientId);
    if (!subs) return 0;

    subs.forEach((ws) => {
      if (ws.userId === doctorId) {
        subs.delete(ws);
        revokedCount++;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ASSIGNMENT_REVOKED',
            patientId,
            message: 'Clinical assignment to this patient was revoked. Real-time access terminated.',
          }));
        }
      }
    });

    if (subs.size === 0) {
      this.patientSubscriptions.delete(patientId);
    }

    logger.info(`[WebSocket] Revoked ${revokedCount} socket subscriptions for doctor ${doctorId} to patient ${patientId}`);
    return revokedCount;
  }

  /**
   * Dispatches a patient-specific event to the patient and all authorized clinical observers.
   * CRITICAL SECURITY GUARANTEE:
   * Dynamic re-validation: Before sending to any observing doctor, re-checks active assignment.
   * If assignment was revoked or cannot be re-validated, drops event and purges doctor immediately.
   */
  async sendToPatient(
    patientId: string,
    type: string,
    payload: any,
    customAuthorizer?: (doctorId: string, patientId: string) => Promise<boolean>
  ): Promise<number> {
    let deliveredCount = 0;
    const packet = JSON.stringify({ type, payload, patientId });

    // 1. Deliver directly to patient's own active sockets
    const patientSockets = this.userSockets.get(patientId);
    if (patientSockets) {
      patientSockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(packet);
          deliveredCount++;
        }
      });
    }

    // 2. Deliver to subscribed clinical rooms with dynamic re-authorization check
    const subs = this.patientSubscriptions.get(patientId);
    if (subs && subs.size > 0) {
      const subscribers = Array.from(subs);
      for (const ws of subscribers) {
        // Skip patient self-socket (already sent above)
        if (ws.userId === patientId) continue;

        if (ws.role === 'ADMIN') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(packet);
            deliveredCount++;
          }
          continue;
        }

        if (ws.role === 'DOCTOR') {
          // Dynamic re-validation before sensitive event dispatch
          let stillAssigned = false;
          try {
            const checkFn = customAuthorizer || this.customAuthorizer || isDoctorAssignedToPatient;
            stillAssigned = await checkFn(ws.userId!, patientId);
          } catch {
            stillAssigned = false; // Fail closed
          }

          if (stillAssigned) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(packet);
              deliveredCount++;
            }
          } else {
            // Assignment revoked or invalid: Purge immediately, fail closed, do NOT deliver payload!
            subs.delete(ws);
            logger.warn(`[WebSocket] Dropped event delivery for revoked doctor ${ws.userId} -> patient ${patientId}. Purged subscription.`);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'ASSIGNMENT_REVOKED',
                patientId,
                message: 'Clinical assignment is no longer active. Real-time patient events terminated.',
              }));
            }
          }
        }
      }
    }

    return deliveredCount;
  }

  // Send packet to specific user id
  sendToUser(userId: string, type: string, payload: any): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return false;
    }

    const packet = JSON.stringify({ type, payload });
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(packet);
      }
    });
    return true;
  }

  // Alias for emitToUser
  emitToUser(userId: string, type: string, payload: any): boolean {
    return this.sendToUser(userId, type, payload);
  }

  // Broadcast packet to everyone online
  broadcast(type: string, payload: any) {
    if (!this.wss) return;
    const packet = JSON.stringify({ type, payload });
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(packet);
      }
    });
  }
}

export const socketService = new SocketService();
