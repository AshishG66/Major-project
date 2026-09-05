import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class SocketService {
  private wss: WebSocketServer | null = null;
  private userSockets: Map<string, Set<AuthenticatedSocket>> = new Map();

  init(server: Server) {
    this.wss = new WebSocketServer({ server });
    logger.info('[WebSocket] WebSocket Broker initialized successfully');

    this.wss.on('connection', (ws: AuthenticatedSocket, req) => {
      ws.isAlive = true;

      // Extract userId from URL query parameter, e.g. ws://localhost:5000/?userId=xxxx or ?token=xxxx
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');
      const token = url.searchParams.get('token');

      let resolvedUserId: string | null = userId;

      // If JWT token is provided, verify and decode it to resolve userId
      if (token) {
        if (token === 'demo-token-123') {
          resolvedUserId = 'demo-patient-amit';
        } else {
          try {
            const JWT_SECRET = process.env.JWT_SECRET || 'hridyadarpan_super_secret_jwt_key_2026';
            const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
            resolvedUserId = decoded.id;
          } catch (err: any) {
            logger.warn(`[WebSocket] Connection rejected due to invalid token: ${err.message}`);
            ws.close(4001, 'Unauthorized');
            return;
          }
        }
      }

      if (!resolvedUserId) {
        logger.warn('[WebSocket] Connection rejected: No user identity provided');
        ws.close(4000, 'User identification required');
        return;
      }

      ws.userId = resolvedUserId;
      
      // Store connection
      if (!this.userSockets.has(resolvedUserId)) {
        this.userSockets.set(resolvedUserId, new Set());
      }
      this.userSockets.get(resolvedUserId)!.add(ws);

      logger.info(`[WebSocket] User ${resolvedUserId} connected. Total sockets for user: ${this.userSockets.get(resolvedUserId)!.size}`);

      // Handle heartbeat check pings
      ws.on('pong', () => {
        ws.isAlive = true;
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
    setInterval(() => {
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
  }

  private removeSocket(userId: string, ws: AuthenticatedSocket) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
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
