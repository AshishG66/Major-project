import dotenv from 'dotenv';
dotenv.config();

async function listGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Failed to list models:', res.status, await res.text());
    return;
  }
  const data = await res.json();
  console.log('Available Models for this API Key:');
  for (const m of data.models || []) {
    if (m.supportedGenerationMethods?.includes('generateContent')) {
      console.log(`- ${m.name} (${m.displayName})`);
    }
  }
}

listGeminiModels();
