import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

const SIGNED_URL_SECRET = process.env.SIGNED_URL_SECRET || process.env.JWT_SECRET || 'hridyadarpan_signed_url_key';
const SIGNED_URL_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a time-limited signed URL for secure resource downloads.
 * Uses HMAC-SHA256 to prevent tampering.
 */
export function generateSignedUrl(basePath: string, resourceId: string): string {
  const expires = Date.now() + SIGNED_URL_EXPIRY_MS;
  const payload = `${basePath}/${resourceId}:${expires}`;
  const signature = crypto
    .createHmac('sha256', SIGNED_URL_SECRET)
    .update(payload)
    .digest('hex');

  return `${basePath}/${resourceId}?expires=${expires}&signature=${signature}`;
}

/**
 * Middleware to validate signed URL parameters.
 * Extracts `expires` and `signature` from query and verifies integrity.
 */
export function validateSignedUrl(req: Request, res: Response, next: NextFunction) {
  const { expires, signature } = req.query;

  if (!expires || !signature) {
    return res.status(403).json({
      success: false,
      message: 'Missing signed URL parameters. Use a signed download link.',
    });
  }

  const expiresNum = Number(expires);
  if (isNaN(expiresNum) || Date.now() > expiresNum) {
    return res.status(410).json({
      success: false,
      message: 'Download link has expired. Please request a new one.',
    });
  }

  // Reconstruct the expected signature
  const resourcePath = req.baseUrl + req.path;
  const payload = `${resourcePath}:${expires}`;
  const expectedSignature = crypto
    .createHmac('sha256', SIGNED_URL_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn(`[SignedURL] Invalid signature for path: ${resourcePath}`);
    return res.status(403).json({
      success: false,
      message: 'Invalid download signature. Access denied.',
    });
  }

  next();
}
