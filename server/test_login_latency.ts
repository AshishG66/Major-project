import dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/config/db.js';
import * as argon2 from 'argon2';

async function testLoginLatency() {
  console.log('Testing login latency...');
  const t0 = performance.now();
  
  const tDb0 = performance.now();
  const user = await prisma.user.findFirst({
    where: { email: 'majorproject12@gmail.com' },
    include: { profile: true },
  });
  console.log(`DB findUnique took: ${(performance.now() - tDb0).toFixed(1)}ms`);

  if (!user) {
    console.log('User majorproject12@gmail.com not found');
    return;
  }

  const tArgon0 = performance.now();
  const isValid = await argon2.verify(user.passwordHash, 'Test@1234');
  console.log(`Argon2 verify took: ${(performance.now() - tArgon0).toFixed(1)}ms (valid: ${isValid})`);

  const tSess0 = performance.now();
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: `test-refresh-${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`Session create took: ${(performance.now() - tSess0).toFixed(1)}ms`);

  const tAudit0 = performance.now();
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'USER_LOGIN',
      details: 'User logged in successfully',
    },
  });
  console.log(`AuditLog create took: ${(performance.now() - tAudit0).toFixed(1)}ms`);

  console.log(`Total login flow took: ${(performance.now() - t0).toFixed(1)}ms`);
  await prisma.$disconnect();
}

testLoginLatency();
