import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testSpeed() {
  console.log('Testing model speeds...');

  // Test gemini-2.0-flash
  try {
    const t0 = Date.now();
    const model20 = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const res20 = await model20.generateContent('Say hello in 1 sentence.');
    console.log(`gemini-2.0-flash latency: ${Date.now() - t0}ms`);
    console.log('Output:', res20.response.text());
  } catch (e) {
    console.error('gemini-2.0-flash error:', e.message);
  }

  // Test gemini-2.5-flash with default
  try {
    const t0 = Date.now();
    const model25 = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const res25 = await model25.generateContent('Say hello in 1 sentence.');
    console.log(`gemini-2.5-flash default latency: ${Date.now() - t0}ms`);
    console.log('Output:', res25.response.text());
  } catch (e) {
    console.error('gemini-2.5-flash default error:', e.message);
  }

  // Test gemini-2.5-flash with thinkingBudget = 0
  try {
    const t0 = Date.now();
    const model25Fast = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      // @ts-ignore
      generationConfig: {
        // @ts-ignore
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });
    const res25Fast = await model25Fast.generateContent('Say hello in 1 sentence.');
    console.log(`gemini-2.5-flash thinkingBudget=0 latency: ${Date.now() - t0}ms`);
    console.log('Output:', res25Fast.response.text());
  } catch (e) {
    console.error('gemini-2.5-flash thinkingBudget=0 error:', e.message);
  }
}

testSpeed();
