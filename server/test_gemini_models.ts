import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testSingleModel(modelName: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  console.log(`Testing model: ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName }, { timeout: 30000 });
    const res = await model.generateContent('Say hello in 3 words');
    console.log(`✅ [SUCCESS] ${modelName}: "${res.response.text().trim()}"`);
    return true;
  } catch (err: any) {
    console.log(`❌ [FAILED] ${modelName}: ${err.message}`);
    return false;
  }
}

async function run() {
  await testSingleModel('gemini-3.6-flash');
  await testSingleModel('gemini-3.1-pro-preview');
}

run();
