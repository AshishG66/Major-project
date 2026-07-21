import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hridyadarpan_super_secret_jwt_key_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'hridyadarpan_super_secret_refresh_key_2026';

// Zod schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().transform((str) => new Date(str)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  height: z.number().positive(),
  weight: z.number().positive(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Helpers
const generateTokens = (user: { id: string; email: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.format(),
      });
    }

    const { email, password, firstName, lastName, dateOfBirth, gender, height, weight } = parsed.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create User, Profile, and MedicalHistory in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          firstName,
          lastName,
          dateOfBirth,
          gender,
          height,
          weight,
        },
      });

      await tx.medicalHistory.create({
        data: {
          userId: newUser.id,
          smokingStatus: 'NEVER',
          alcoholLevel: 'NONE',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'USER_REGISTER',
          details: `Registered account with email: ${email}`,
        },
      });

      return newUser;
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Save session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName,
        lastName,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: parsed.error.format(),
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Save session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: 'User logged in successfully',
      },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify session exists in DB
    const dbSession = await prisma.session.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    });

    // RTR Reuse Detection: if token is valid but NOT in DB, it has been reused/hijacked!
    if (!dbSession) {
      try {
        const decoded = jwt.verify(token, REFRESH_SECRET) as { id: string };
        logger.warn(`[Security-RTR] Reused token detected for user ${decoded.id}. Purging all sessions!`);
        await prisma.session.deleteMany({ where: { userId: decoded.id } });
      } catch {}
      return res.status(401).json({
        success: false,
        message: 'Session has expired or token reuse detected. Log in again.',
      });
    }

    if (dbSession.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: dbSession.id } });
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired',
      });
    }

    const decoded = jwt.verify(token, REFRESH_SECRET) as { id: string };
    if (decoded.id !== dbSession.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session metadata',
      });
    }

    // Rotate Tokens: Generate a new token pair
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(dbSession.user);

    // Swap token sessions in database
    await prisma.$transaction(async (tx) => {
      await tx.session.delete({ where: { id: dbSession.id } });
      await tx.session.create({
        data: {
          userId: dbSession.user.id,
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    });

    // Set new HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    logger.error(`[Security-RTR] Token refresh failed: ${error.message}`);
    res.status(401).json({ success: false, message: 'Session validation failed' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (token) {
      // Delete session from DB
      await prisma.session.deleteMany({
        where: { refreshToken: token },
      });
    }

    res.clearCookie('refreshToken');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        medicalHistory: true,
      },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        include: {
          profile: true,
          medicalHistory: true,
        },
      });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        medicalHistory: user.medicalHistory,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
