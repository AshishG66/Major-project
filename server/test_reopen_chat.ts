import dotenv from 'dotenv';
dotenv.config();
import { askHridyaAI } from './src/services/aiOrchestrator.js';
import { prisma } from './src/config/db.js';

async function testChatFlow() {
  console.log('Testing Chat flow...');
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found');
      process.exit(1);
    }
    console.log('Using user:', user.id, user.email);

    // Call 1: First opening (new session)
    console.log('\n--- FIRST OPENING ---');
    const res1 = await askHridyaAI(user.id, null, 'Hello, I want to know about cardiac health');
    console.log('Res1 Session:', res1.sessionId);
    console.log('Res1 Reply preview:', res1.reply.slice(0, 100));

    // Call 2: Second opening (reopening same session)
    console.log('\n--- SECOND OPENING (REOPEN) ---');
    const res2 = await askHridyaAI(user.id, res1.sessionId, 'What exercises are best?');
    console.log('Res2 Session:', res2.sessionId);
    console.log('Res2 Reply preview:', res2.reply.slice(0, 100));

    console.log('\nSUCCESS! Both calls completed.');
  } catch (err) {
    console.error('\nTEST FAILED WITH ERROR:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testChatFlow();
