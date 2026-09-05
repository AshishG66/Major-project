import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Periodic lightweight keep-alive ping (every 2.5 minutes) to eliminate Neon Postgres cold connection penalties
const KEEP_ALIVE_INTERVAL_MS = 2.5 * 60 * 1000;

setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    logger.warn(`[DB KeepAlive] Ping deferred or re-establishing connection: ${err.message}`);
  }
}, KEEP_ALIVE_INTERVAL_MS).unref();
