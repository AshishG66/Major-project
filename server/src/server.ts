import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error.js';
import { prisma } from './config/db.js';
import { authenticate, AuthRequest } from './middleware/auth.js';
import { socketService } from './services/socketService.js';
import { initEventBusListeners } from './services/eventBusListeners.js';
import { metricsMiddleware, registry } from './middleware/metrics.js';
import { getAITelemetryStats } from './services/aiTelemetry.js';
import { seedKnowledgeBase } from './services/vectorRagService.js';
import { generateSignedUrl } from './middleware/signedUrls.js';
import { generateTOTPSecret, verifyTOTPToken, detectLoginAnomaly } from './services/twoFactorService.js';

// Routers
import authRouter from './auth/auth.router.js';
import predictionRouter from './prediction/prediction.router.js';
import chatRouter from './chat/chat.router.js';
import mapsRouter from './maps/maps.router.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Standard Middlewares
app.use(compression());
app.use(express.json({ limit: '10mb' })); // Support base64 image report uploads!

// Request logger middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
});

// Prometheus metrics middleware
app.use(metricsMiddleware);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', generalLimiter);

// Bind core API routers
app.use('/api/auth', authRouter);
app.use('/api/prediction', predictionRouter);
app.use('/api/chat', chatRouter);
app.use('/api/maps', mapsRouter);

// 1. LIFESTYLE LOGGING & ACHIEVEMENTS ENGINE
app.post('/api/lifestyle', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { waterIntake, sleepHours, stepsCount, activeMins, stressLevel } = req.body;

    const wIntake = parseFloat(waterIntake) || 0;
    const steps = parseInt(stepsCount) || 0;
    const active = parseInt(activeMins) || 0;
    const sleep = parseFloat(sleepHours) || 0;

    const log = await prisma.lifestyleLog.create({
      data: {
        userId: userId!,
        waterIntake: wIntake,
        sleepHours: sleep,
        stepsCount: steps,
        activeMins: active,
        stressLevel: parseInt(stressLevel) || 5,
        date: new Date(),
      },
    });

    // Achievement Badges logic check
    const badgesToAward: string[] = [];
    if (wIntake >= 3.0) {
      // Check if badge already exists
      const existing = await prisma.userBadge.findFirst({
        where: { userId, badgeName: 'HYDRATION_HERO' }
      });
      if (!existing) badgesToAward.push('HYDRATION_HERO');
    }
    if (steps >= 10000) {
      const existing = await prisma.userBadge.findFirst({
        where: { userId, badgeName: 'STEPS_CHAMPION' }
      });
      if (!existing) badgesToAward.push('STEPS_CHAMPION');
    }
    if (active >= 60) {
      const existing = await prisma.userBadge.findFirst({
        where: { userId, badgeName: 'DAILY_RUNNER' }
      });
      if (!existing) badgesToAward.push('DAILY_RUNNER');
    }

    // Award badges
    for (const badge of badgesToAward) {
      let desc = "Awarded for healthy lifestyle logs.";
      if (badge === 'HYDRATION_HERO') desc = "Logged 3.0+ liters of water in a single day.";
      if (badge === 'STEPS_CHAMPION') desc = "Crossed 10,000 active steps milestone.";
      if (badge === 'DAILY_RUNNER') desc = "Completed 60+ minutes of cardiovascular training.";

      await prisma.userBadge.create({
        data: {
          userId: userId!,
          badgeName: badge,
          description: desc,
        }
      });

      // Insert system notification
      await prisma.notification.create({
        data: {
          userId: userId!,
          type: 'SYSTEM',
          title: 'Achievement Unlocked!',
          message: `Congratulations! You unlocked the "${badge.replace('_', ' ')}" Badge!`,
        }
      });
    }

    // Update cardio score
    let dailyScore = 50;
    if (steps >= 10000) dailyScore += 15;
    else if (steps >= 5000) dailyScore += 8;
    
    if (wIntake >= 2.5) dailyScore += 15;
    if (active >= 30) dailyScore += 15;
    if (sleep >= 7 && sleep <= 9) dailyScore += 10;
    dailyScore = Math.min(100, dailyScore);

    await prisma.healthScore.create({
      data: {
        userId: userId!,
        score: dailyScore,
        cardioIndex: parseFloat((dailyScore * 0.95).toFixed(1)),
      }
    });

    res.status(201).json({ success: true, log, newBadges: badgesToAward });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/lifestyle', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const logs = await prisma.lifestyleLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 7,
    });
    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. HEALTH REMINDERS API
app.post('/api/reminders', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { title, time, type, daysOfWeek } = req.body;

    const reminder = await prisma.reminder.create({
      data: {
        userId: userId!,
        title,
        time,
        type,
        daysOfWeek: daysOfWeek || '1,2,3,4,5,6,7',
      }
    });

    res.status(201).json({ success: true, reminder });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/reminders', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const reminders = await prisma.reminder.findMany({
      where: { userId, isActive: true },
      orderBy: { time: 'asc' }
    });
    res.status(200).json({ success: true, reminders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/reminders/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    await prisma.reminder.deleteMany({
      where: { id: id as string, userId: userId as string }
    });
    res.status(200).json({ success: true, message: 'Reminder cleared.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. FAMILY DASHBOARD API
app.post('/api/family', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { name, relationship, email } = req.body;

    // Optional: link user account if email is provided
    let linkedUserId = null;
    if (email) {
      const matchUser = await prisma.user.findUnique({ where: { email } });
      if (matchUser) linkedUserId = matchUser.id;
    }

    const member = await prisma.familyMember.create({
      data: {
        primaryUserId: userId!,
        name,
        relationship,
        linkedUserId,
      }
    });

    res.status(201).json({ success: true, member });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/family', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const members = await prisma.familyMember.findMany({
      where: { primaryUserId: userId },
      include: { linkedUser: { include: { profile: true, predictions: { take: 1, orderBy: { createdAt: 'desc' } } } } }
    });
    res.status(200).json({ success: true, members });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. ACHIEVEMENTS & BADGES API
app.get('/api/badges', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const achievements = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { awardedAt: 'desc' }
    });
    res.status(200).json({ success: true, achievements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. DOCTOR PORTAL & NOTES API
app.post('/api/doctor/note', authenticate, async (req, res) => {
  try {
    const doctorId = (req as AuthRequest).user?.id;
    const role = (req as AuthRequest).user?.role;
    
    if (role !== 'DOCTOR' && role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden. Access restricted to medical professionals.' });
    }

    const { patientId, note } = req.body;
    const doctorNote = await prisma.doctorNote.create({
      data: {
        doctorId: doctorId!,
        patientId,
        note,
      }
    });

    res.status(201).json({ success: true, doctorNote });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/doctor/notes/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const notes = await prisma.doctorNote.findMany({
      where: { patientId: patientId as string },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { include: { profile: true } } }
    });
    res.status(200).json({ success: true, notes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/doctor/patients', authenticate, async (req, res) => {
  try {
    const role = (req as AuthRequest).user?.role;
    if (role !== 'DOCTOR' && role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // List all users with profiles and latest predictions
    const patients = await prisma.user.findMany({
      where: { role: 'USER' },
      include: {
        profile: true,
        predictions: { take: 1, orderBy: { createdAt: 'desc' } }
      }
    });

    res.status(200).json({ success: true, patients });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. ADMIN PORTAL AUDITS & STATS API
app.get('/api/admin/stats', authenticate, async (req, res) => {
  try {
    const role = (req as AuthRequest).user?.role;
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin permissions required.' });
    }

    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const totalDoctors = await prisma.user.count({ where: { role: 'DOCTOR' } });
    const totalPredictions = await prisma.prediction.count();
    const totalReports = await prisma.report.count();
    
    // Aggregate risk divisions
    const highRiskCount = await prisma.prediction.count({ where: { riskLevel: 'HIGH' } });
    const modRiskCount = await prisma.prediction.count({ where: { riskLevel: 'MODERATE' } });
    const lowRiskCount = await prisma.prediction.count({ where: { riskLevel: 'LOW' } });

    res.status(200).json({
      success: true,
      stats: {
        users: totalUsers,
        doctors: totalDoctors,
        predictions: totalPredictions,
        reports: totalReports,
        risks: {
          HIGH: highRiskCount,
          MODERATE: modRiskCount,
          LOW: lowRiskCount
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/audit', authenticate, async (req, res) => {
  try {
    const role = (req as AuthRequest).user?.role;
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { include: { profile: true } } }
    });

    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. AGGREGATED DASHBOARD LOADER
app.get('/api/dashboard', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const role = (req as AuthRequest).user?.role;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    // Latest scans
    const latestPrediction = await prisma.prediction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Score
    const healthScore = await prisma.healthScore.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Active Diet & Exercise plans
    const activeDiet = await prisma.dietPlan.findFirst({
      where: { userId, isActive: true },
    });

    const activeExercise = await prisma.exercisePlan.findFirst({
      where: { userId, isActive: true },
    });

    // Badges & Milestones
    const badges = await prisma.userBadge.findMany({
      where: { userId },
      take: 4,
      orderBy: { awardedAt: 'desc' }
    });

    // Today's lifestyle logging
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayLogs = await prisma.lifestyleLog.findMany({
      where: {
        userId,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    const waterToday = todayLogs.reduce((sum, item) => sum + item.waterIntake, 0);
    const stepsToday = todayLogs.reduce((sum, item) => sum + item.stepsCount, 0);
    const activeMinsToday = todayLogs.reduce((sum, item) => sum + item.activeMins, 0);
    const sleepToday = todayLogs.reduce((sum, item) => sum + item.sleepHours, 0) || 7.0;

    res.status(200).json({
      success: true,
      user: {
        id: userId,
        firstName: user?.profile?.firstName || 'User',
        lastName: user?.profile?.lastName || '',
        email: user?.email,
        role,
      },
      cardioRisk: latestPrediction ? {
        id: latestPrediction.id,
        riskLevel: latestPrediction.riskLevel,
        riskScore: latestPrediction.riskScore,
        confidenceScore: latestPrediction.confidenceScore,
        modelName: latestPrediction.modelName,
        createdAt: latestPrediction.createdAt,
      } : null,
      healthScore: healthScore ? healthScore.score : null,
      preventionPlans: {
        diet: activeDiet ? JSON.parse(JSON.stringify(activeDiet.planData)) : null,
        exercise: activeExercise ? JSON.parse(JSON.stringify(activeExercise.planData)) : null,
      },
      lifestyleSummary: {
        water: waterToday,
        steps: stepsToday,
        activeMins: activeMinsToday,
        sleep: sleepToday,
      },
      badges,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. GEMINI-POWERED AI HEALTH SUMMARY
app.get('/api/ai-summary', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const latestPrediction = await prisma.prediction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { factors: true },
    });

    const healthScore = await prisma.healthScore.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Today's lifestyle
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayLogs = await prisma.lifestyleLog.findMany({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
    });

    const waterToday = todayLogs.reduce((sum, item) => sum + item.waterIntake, 0);
    const stepsToday = todayLogs.reduce((sum, item) => sum + item.stepsCount, 0);
    const sleepToday = todayLogs.reduce((sum, item) => sum + item.sleepHours, 0) || 0;

    const firstName = user?.profile?.firstName || 'User';
    const factors = latestPrediction?.factors as Record<string, any> || {};
    const riskLevel = latestPrediction?.riskLevel || 'UNSCANNED';
    const score = healthScore?.score || 0;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    if (!apiKey) {
      // Fallback: return a structured summary without Gemini
      return res.status(200).json({
        success: true,
        source: 'fallback',
        greeting: `Good Morning ${firstName}`,
        summary: [
          `Your health score is ${score}/100 with ${riskLevel} cardiovascular risk.`,
          factors.systolicBP ? `Systolic BP: ${factors.systolicBP} mmHg` : 'No BP data available yet.',
          sleepToday > 0 ? `Sleep logged today: ${sleepToday}h` : 'No sleep data logged today.',
          stepsToday > 0 ? `Steps today: ${stepsToday}` : 'No steps logged today.',
          waterToday > 0 ? `Water intake: ${waterToday}L` : 'No water intake logged today.',
          'Run a prediction scan or set your GEMINI_API_KEY for AI-powered insights.',
        ],
        badge: riskLevel === 'HIGH' ? 'High Risk Alert' : riskLevel === 'MODERATE' ? 'Moderate Alert' : 'Vitals Synced',
        alert: riskLevel === 'HIGH' || riskLevel === 'MODERATE',
      });
    }

    // Build prompt with real patient data
    const prompt = `You are HridyaAI, a cardiovascular health assistant inside HridyaDarpan, an AI healthcare SaaS platform.

Generate a brief, personalized morning health summary for the patient. Use bullet points (4-5 items max). Be concise and actionable. Do NOT use markdown headers. Each bullet should start with "•".

Patient Data:
- Name: ${firstName}
- Health Score: ${score}/100
- Risk Level: ${riskLevel}
- Systolic BP: ${factors.systolicBP || 'N/A'} mmHg
- Diastolic BP: ${factors.diastolicBP || 'N/A'} mmHg
- Heart Rate: ${factors.heartRate || 'N/A'} bpm
- BMI: ${factors.bmi || 'N/A'}
- Cholesterol: ${factors.cholesterol || 'N/A'} mg/dL
- Sleep Duration: ${factors.sleepDuration || sleepToday || 'N/A'} hours
- Exercise Frequency: ${factors.exerciseFrequency || 'N/A'} days/week
- Stress Level: ${factors.stressLevel || 'N/A'}/10
- Steps Today: ${stepsToday}
- Water Today: ${waterToday}L

Respond ONLY with the bullet points, nothing else. Keep clinical tone but friendly.`;

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const bullets = text.split('\n').filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-'));
    const cleanBullets = bullets.map((b: string) => b.trim().replace(/^-\s*/, '• '));

    res.status(200).json({
      success: true,
      source: 'gemini',
      greeting: `Good Morning ${firstName}`,
      summary: cleanBullets.length > 0 ? cleanBullets : [text],
      badge: riskLevel === 'HIGH' ? 'High Risk Alert' : riskLevel === 'MODERATE' ? 'Moderate Alert' : riskLevel === 'LOW' ? 'Cardio Status Optimal' : 'Vitals Synced',
      alert: riskLevel === 'HIGH' || riskLevel === 'MODERATE',
    });
  } catch (error: any) {
    logger.error(`AI Summary generation failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Notifications
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });
    res.status(200).json({ success: true, notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/notifications/read', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health diagnostics check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$executeRaw`SELECT 1`;
    let aiStatus = 'offline';
    try {
      const response = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/health`);
      if (response.ok) aiStatus = 'online';
    } catch {}
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      aiService: aiStatus,
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Custom interactive Swagger-style REST docs
app.get('/api/docs', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>HridyaDarpan REST Gateway API Documentation</title>
        <style>
          body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background: #030712; color: #f3f4f6; margin: 0; padding: 2rem; }
          .container { max-w: 800px; margin: 0 auto; background: #111827; border: 1px solid rgba(255,255,255,0.06); padding: 2rem; border-radius: 12px; }
          h1 { font-size: 1.5rem; color: #3b82f6; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem; }
          .endpoint { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
          .method { display: inline-block; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.5rem; }
          .post { background: rgba(6,182,212,0.15); color: #06b6d4; }
          .get { background: rgba(59,130,246,0.15); color: #3b82f6; }
          .delete { background: rgba(244,63,94,0.15); color: #f43f5e; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>HridyaDarpan REST Gateway API Documentation</h1>
          
          <div class="endpoint">
            <span class="method get">GET</span> <code>/api/health</code>
            <p style="font-size:0.75rem; color:#9ca3af; margin:0.5rem 0 0;">Check gateway connectivity, Neon PostgreSQL ping, and FastAPI health.</p>
          </div>

          <div class="endpoint">
            <span class="method post">POST</span> <code>/api/auth/register</code>
            <p style="font-size:0.75rem; color:#9ca3af; margin:0.5rem 0 0;">Creates user profiles and hashes password inputs.</p>
          </div>

          <div class="endpoint">
            <span class="method post">POST</span> <code>/api/prediction</code>
            <p style="font-size:0.75rem; color:#9ca3af; margin:0.5rem 0 0;">Submits vitals to XGBoost classifier and records SHAP logs.</p>
          </div>

          <div class="endpoint">
            <span class="method post">POST</span> <code>/api/chat/message</code>
            <p style="font-size:0.75rem; color:#9ca3af; margin:0.5rem 0 0;">Sends inputs to AI Orchestrator, executing local RAG guides.</p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Error handling middleware
app.use(errorHandler);

const httpServer = createServer(app);

// ─── Prometheus Metrics Endpoint ───
app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(registry.serialize());
});

// ─── AI Observability Admin Endpoint ───
app.get('/api/admin/ai-telemetry', authenticate, async (req, res) => {
  try {
    const role = (req as AuthRequest).user?.role;
    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const stats = await getAITelemetryStats();
    res.status(200).json({ success: true, ...stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 2FA Setup Endpoint ───
app.post('/api/auth/setup-2fa', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthenticated' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { secret, qrCodeUri } = generateTOTPSecret(user.email);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    res.status(200).json({ success: true, qrCodeUri, secret });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/enable-2fa', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthenticated' });

    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA not set up. Call /api/auth/setup-2fa first.' });
    }

    const isValid = verifyTOTPToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid TOTP code. Please try again.' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    res.status(200).json({ success: true, message: 'Two-factor authentication enabled successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ success: false, message: 'userId and token are required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId as string } });
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA not configured for this user.' });
    }

    const isValid = verifyTOTPToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA code.' });
    }

    // Issue tokens (import jwt inline to avoid circular deps)
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'hridyadarpan_super_secret_jwt_key_2026';
    const accessToken = jwt.default.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      success: true,
      token: accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Signed Report Download URL ───
app.get('/api/prediction/report-url/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    const prediction = await prisma.prediction.findFirst({
      where: { id: id as string, userId: userId as string },
    });
    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction not found.' });
    }
    const signedUrl = generateSignedUrl('/api/prediction/download', id as string);
    res.status(200).json({ success: true, downloadUrl: signedUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Startup verification for Gemini API Key and Connection
const verifyGeminiConfiguration = async () => {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!key) {
    logger.warn('⚠️ [HridyaAI Startup Warning] Neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured in environment.');
    return;
  }
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  logger.info(`✅ [HridyaAI] Configured Gemini API Key present. Model: "${modelName}".`);
};

// Connect DB and Start Server
const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully');
  } catch (error: any) {
    logger.warn(`⚠️ [Database Warning] Initial DB connection deferred: ${error.message}. Express server remaining online in resilient fallback mode.`);
  }

  try {
    // Check Gemini API Configuration asynchronously
    verifyGeminiConfiguration().catch(err => {
      logger.error(`Error during Gemini API configuration check: ${err.message}`);
    });

    // Bind Event Bus async listeners
    initEventBusListeners();

    // Attach WebSockets server to http server
    socketService.init(httpServer);

    // Seed vector RAG knowledge base (idempotent)
    seedKnowledgeBase().catch(err => {
      logger.warn(`[VectorRAG] Knowledge base seeding deferred: ${err.message}`);
    });
    
    httpServer.listen(PORT, () => {
      logger.info(`✅ REST API Gateway is online at http://localhost:${PORT}`);
    });
  } catch (error: any) {
    logger.error(`Server initialization error: ${error.message}`);
  }
};

startServer();
