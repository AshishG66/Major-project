import dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/config/db.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

async function runLifecycleDiagnostic() {
  console.log('=== STARTING HRIDAYADARPANA LIFECYCLE DIAGNOSTIC ===\n');

  try {
    // 1. Check DB latency
    const t0 = performance.now();
    const user = await prisma.user.findFirst({
      include: { profile: true },
    });
    const t1 = performance.now();
    console.log(`[1. DB findFirst User]: ${(t1 - t0).toFixed(0)}ms`);
    if (!user) {
      console.log('No user found in database!');
      return;
    }
    console.log(`Found user: ${user.id} (${user.email})`);

    // 2. Simulate Login
    const tLoginStart = performance.now();
    const JWT_SECRET = process.env.JWT_SECRET || 'hridyadarpan_super_secret_jwt_key_2026';
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_SECRET || 'hridyadarpan_super_refresh_jwt_key_2026',
      { expiresIn: '7d' }
    );

    // Current blocking session + auditLog writes
    const tSessionStart = performance.now();
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const tSessionEnd = performance.now();
    console.log(`[2. Login session.create (blocking)]: ${(tSessionEnd - tSessionStart).toFixed(0)}ms`);

    const tAuditStart = performance.now();
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: 'User logged in successfully',
      },
    });
    const tAuditEnd = performance.now();
    console.log(`[3. Login auditLog.create (blocking)]: ${(tAuditEnd - tAuditStart).toFixed(0)}ms`);
    console.log(`[Total Login Latency]: ${(tAuditEnd - tLoginStart).toFixed(0)}ms\n`);

    // 3. Test HridayaAI Orchestrator Flow 1 (First opening)
    console.log('--- TEST 1: FIRST CHAT OPENING ---');
    const { askHridyaAI } = await import('./src/services/aiOrchestrator.js');
    
    const tChat1Start = performance.now();
    const chat1Res = await askHridyaAI(user.id, null, 'Hello Doctor, what is normal resting heart rate?');
    const tChat1End = performance.now();
    console.log(`Chat 1 completed in: ${(tChat1End - tChat1Start).toFixed(0)}ms`);
    console.log(`Chat 1 Session ID: ${chat1Res.sessionId}`);
    console.log(`Chat 1 Agent: ${chat1Res.agentType}`);
    console.log(`Chat 1 Reply preview: ${chat1Res.reply.slice(0, 80)}...`);

    // 4. Test fetch sessions (Simulate leaving and returning to ChatPage)
    console.log('\n--- TEST 2: LEAVING AND REOPENING CHAT ---');
    const tSessionsStart = performance.now();
    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const tSessionsEnd = performance.now();
    console.log(`Fetched ${sessions.length} sessions in ${(tSessionsEnd - tSessionsStart).toFixed(0)}ms`);
    console.log(`Most recent session ID: ${sessions[0]?.id}`);

    // Fetch messages of the active session
    const tMsgsStart = performance.now();
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: sessions[0]?.id },
      orderBy: { createdAt: 'asc' },
    });
    const tMsgsEnd = performance.now();
    console.log(`Fetched ${messages.length} messages in ${(tMsgsEnd - tMsgsStart).toFixed(0)}ms`);
    messages.forEach((m, i) => {
      console.log(`  Msg ${i+1} [${m.role}]: ${m.content.slice(0, 40)}...`);
    });

    // 5. Test HridayaAI Flow 2 (Second message in reopened session)
    console.log('\n--- TEST 3: SECOND MESSAGE IN REOPENED SESSION ---');
    const tChat2Start = performance.now();
    const chat2Res = await askHridyaAI(user.id, sessions[0]?.id, 'And what if my resting rate is 95 bpm?');
    const tChat2End = performance.now();
    console.log(`Chat 2 completed in: ${(tChat2End - tChat2Start).toFixed(0)}ms`);
    console.log(`Chat 2 Session ID: ${chat2Res.sessionId}`);
    console.log(`Chat 2 Agent: ${chat2Res.agentType}`);
    console.log(`Chat 2 Reply preview: ${chat2Res.reply.slice(0, 80)}...`);

    // 6. Test Flow 3: Reopen with a third message or new consultation
    console.log('\n--- TEST 4: NEW CONSULTATION OR SUBSEQUENT REOPEN ---');
    const tChat3Start = performance.now();
    const chat3Res = await askHridyaAI(user.id, null, 'Give me a DASH diet plan');
    const tChat3End = performance.now();
    console.log(`Chat 3 completed in: ${(tChat3End - tChat3Start).toFixed(0)}ms`);
    console.log(`Chat 3 Session ID: ${chat3Res.sessionId}`);
    console.log(`Chat 3 Agent: ${chat3Res.agentType}`);
    console.log(`Chat 3 Reply preview: ${chat3Res.reply.slice(0, 80)}...`);

    console.log('\n=== DIAGNOSTIC COMPLETE: ALL BACKEND AI STEPS FUNCTIONAL ===');
  } catch (err: any) {
    console.error('\n❌ DIAGNOSTIC FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runLifecycleDiagnostic();
