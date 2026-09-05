import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

dotenv.config();
const prisma = new PrismaClient();

async function testLogin() {
  console.time('Full Login Flow');
  
  console.time('1. findUnique user');
  const user = await prisma.user.findFirst({
    include: { profile: true },
  });
  console.timeEnd('1. findUnique user');

  if (!user) {
    console.log('No user');
    return;
  }

  console.time('2. argon2 verify (fake test)');
  // fake argon2 hash and verify
  const dummyHash = await argon2.hash('password123');
  await argon2.verify(dummyHash, 'password123');
  console.timeEnd('2. argon2 verify (fake test)');

  console.time('3. Session + AuditLog Promise.all');
  const refreshToken = 'test-token-' + Date.now();
  await Promise.all([
    prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: 'User logged in successfully',
      },
    }).catch(e => console.warn('Audit error', e.message))
  ]);
  console.timeEnd('3. Session + AuditLog Promise.all');

  console.timeEnd('Full Login Flow');

  // cleanup test session
  await prisma.session.deleteMany({ where: { refreshToken } });
  await prisma.$disconnect();
}

testLogin().catch(console.error);
