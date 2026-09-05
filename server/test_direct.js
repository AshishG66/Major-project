import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

// Direct URL without -pooler
const directUrl = process.env.DATABASE_URL.replace('-pooler', '').replace('&pgbouncer=true', '');
console.log('Testing direct URL:', directUrl.replace(/:[^:@]+@/, ':***@'));

const prismaDirect = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

async function testDirect() {
  console.time('Direct connect');
  await prismaDirect.$connect();
  console.timeEnd('Direct connect');

  console.time('Direct query 1');
  await prismaDirect.user.findFirst();
  console.timeEnd('Direct query 1');

  console.time('Direct query 2');
  await prismaDirect.user.findFirst();
  console.timeEnd('Direct query 2');

  await prismaDirect.$disconnect();
}

testDirect().catch(console.error);
