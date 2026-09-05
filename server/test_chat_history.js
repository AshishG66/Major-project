import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

function sanitizeGeminiHistory(messages) {
  const sanitized = [];
  for (const msg of messages) {
    const role = msg.role === 'USER' ? 'user' : 'model';
    if (sanitized.length === 0) {
      if (role === 'user') {
        sanitized.push({ role: 'user', parts: [{ text: msg.content }] });
      }
    } else {
      const lastRole = sanitized[sanitized.length - 1].role;
      if (role !== lastRole) {
        sanitized.push({ role, parts: [{ text: msg.content }] });
      } else {
        sanitized[sanitized.length - 1].parts[0].text += `\n${msg.content}`;
      }
    }
  }
  if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === 'user') {
    sanitized.pop();
  }
  return sanitized;
}

async function testSecondMessage() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const history = sanitizeGeminiHistory([
    { role: 'USER', content: 'Hello doctor' },
    { role: 'ASSISTANT', content: 'Hello, how can I help you today?' }
  ]);
  console.log('History:', JSON.stringify(history));

  try {
    const chat = model.startChat({ history });
    const res = await chat.sendMessage('I have slight chest pain');
    console.log('Success reply:', res.response.text());
  } catch (err) {
    console.error('Chat failed:', err);
  }
}

testSecondMessage();
