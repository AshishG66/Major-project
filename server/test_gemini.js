import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
console.log('Testing Gemini API key prefix:', apiKey.slice(0, 10));

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function testGemini() {
  console.time('gemini-call');
  try {
    const res = await model.generateContent('Hello');
    console.timeEnd('gemini-call');
    console.log('Gemini reply:', res.response.text());
  } catch (err) {
    console.timeEnd('gemini-call');
    console.error('Gemini error:', err.message);
  }
}

testGemini();
