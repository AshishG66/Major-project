import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

// ─── TOTP (Time-based One-Time Password) Implementation ───
// RFC 6238 compliant, no external dependencies

const TOTP_PERIOD = 30;     // seconds
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'sha1';

/**
 * Generate a base32 encoded secret for a user's 2FA setup.
 * Returns the secret and a QR code data URI for authenticator app scanning.
 */
export function generateTOTPSecret(userEmail: string): { secret: string; qrCodeUri: string } {
  // Generate 20 random bytes and encode as base32
  const buffer = crypto.randomBytes(20);
  const secret = base32Encode(buffer);

  // Build otpauth URI for authenticator apps
  const issuer = 'HridyaDarpan';
  const otpauthUri = `otpauth://totp/${issuer}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

  logger.info(`[2FA] Generated TOTP secret for ${userEmail}`);

  return { secret, qrCodeUri: otpauthUri };
}

/**
 * Verify a 6-digit TOTP code against the stored secret.
 * Allows for ±1 time window drift.
 */
export function verifyTOTPToken(secret: string, token: string): boolean {
  const currentTime = Math.floor(Date.now() / 1000);

  // Check current window and ±1 window for clock drift tolerance
  for (let drift = -1; drift <= 1; drift++) {
    const timeStep = Math.floor((currentTime + drift * TOTP_PERIOD) / TOTP_PERIOD);
    const expectedToken = generateTOTP(secret, timeStep);
    if (expectedToken === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a TOTP code for a specific time step.
 */
function generateTOTP(base32Secret: string, timeStep: number): string {
  const key = base32Decode(base32Secret);
  
  // Convert time step to 8-byte buffer (big-endian)
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(timeStep, 4);

  // HMAC-SHA1
  const hmac = crypto.createHmac(TOTP_ALGORITHM, key);
  hmac.update(timeBuffer);
  const hmacResult = hmac.digest();

  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const code = (
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS);

  return code.toString().padStart(TOTP_DIGITS, '0');
}

// ─── Base32 Encoding/Decoding ───
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleanStr = encoded.replace(/=+$/, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleanStr) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ─── Login Anomaly Detection ───

/**
 * Check if a login attempt is anomalous based on recent session patterns.
 * Returns true if the IP or user agent significantly differs from recent sessions.
 */
export async function detectLoginAnomaly(
  userId: string,
  currentIp: string,
  currentUserAgent: string
): Promise<{ isAnomalous: boolean; reason?: string }> {
  try {
    const recentSessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { ipAddress: true, userAgent: true },
    });

    if (recentSessions.length === 0) {
      return { isAnomalous: false }; // First login, nothing to compare
    }

    // Check if current IP is completely new
    const knownIps = new Set(recentSessions.map(s => s.ipAddress).filter(Boolean));
    const ipIsNew = knownIps.size > 0 && !knownIps.has(currentIp);

    // Check if user agent is significantly different (different browser/OS family)
    const knownAgents = recentSessions.map(s => s.userAgent || '').filter(Boolean);
    const agentIsNew = knownAgents.length > 0 && !knownAgents.some(a => 
      extractBrowserFamily(a) === extractBrowserFamily(currentUserAgent)
    );

    if (ipIsNew && agentIsNew) {
      logger.warn(`[SecurityAnomaly] User ${userId} login from new IP (${currentIp}) AND new browser`);
      return {
        isAnomalous: true,
        reason: `Login detected from a new IP address (${currentIp}) and unfamiliar browser. If this wasn't you, please change your password immediately.`,
      };
    }

    if (ipIsNew) {
      logger.info(`[SecurityAnomaly] User ${userId} login from new IP: ${currentIp}`);
      return {
        isAnomalous: true,
        reason: `Login detected from a new IP address (${currentIp}). This is logged for your security.`,
      };
    }

    return { isAnomalous: false };
  } catch (err: any) {
    logger.warn(`[SecurityAnomaly] Anomaly detection failed: ${err.message}`);
    return { isAnomalous: false };
  }
}

function extractBrowserFamily(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}
