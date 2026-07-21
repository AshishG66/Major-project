import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { logger } from '../config/logger.js';

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      logger.warn('[RBAC] Access rejected: User context missing');
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn(`[RBAC] Access forbidden for user ${user.id} with role ${user.role}. Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: 'Access Forbidden. You do not possess the required operational privileges.'
      });
    }

    next();
  };
};
