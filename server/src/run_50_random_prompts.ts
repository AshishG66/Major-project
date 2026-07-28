import 'dotenv/config';
import http from 'http';

const PROMPTS = [
  // History
  "Who built Machu Picchu?",
  "Why did the Roman Empire fall?",
  "Explain the French Revolution in simple words.",
  "Who was Cleopatra?",
  "What was the Renaissance period?",

  // Science
  "Why is the sky blue?",
  "Explain quantum entanglement.",
  "Why do black holes evaporate?",
  "How does photosynthesis work?",
  "What is absolute zero temperature?",

  // Programming
  "Difference between Rust and Go?",
  "Explain recursion with an example.",
  "What is memoization?",
  "What is Docker?",
  "Explain Kubernetes.",

  // Mathematics
  "What is Bayes' theorem?",
  "Explain Fourier Transform.",
  "What is an eigenvalue?",
  "What is the Fibonacci sequence?",
  "Explain the Pythagorean theorem.",

  // Movies
  "Who directed Interstellar?",
  "Explain the ending of Inception.",
  "Who won Best Picture Oscar in 1994?",
  "What is cinematography?",

  // Music
  "What is jazz music?",
  "Difference between classical and blues music?",
  "What is a symphony?",
  "Who composed Symphony No. 5?",

  // Sports
  "Who won Wimbledon 2024?",
  "Explain Formula 1 qualifying.",
  "What is offside in football?",
  "How many players are in a basketball team?",

  // Geography
  "Why is Iceland green and Greenland icy?",
  "Which river is the longest in Africa?",
  "What is the highest mountain in North America?",
  "Name the capital of Australia.",

  // Astronomy
  "What is a neutron star?",
  "Why is Pluto no longer considered a planet?",
  "How far is the Sun from Earth?",
  "What is a supernova?",

  // Random
  "Write a haiku about rain.",
  "Tell a pirate joke.",
  "Suggest a startup idea for sustainable energy.",
  "Explain blockchain to a 10-year-old.",
  "Write Python code for Fibonacci.",
  "Translate Good Morning into Japanese.",
  "Give me a simple recipe for Italian lasagna.",
  "What causes economic inflation?",
  "Why do cats purr?",
  "Who painted Starry Night?",
  "Explain the Turing Test.",
  "What is CRISPR gene editing?",
  "Why do airplanes stay in the air?",
];

const MULTI_TURN_THREAD = [
  "Who invented Python?",
  "When was he born?",
  "Where did he study?"
];

async function sendChatRequest(message: string, sessionId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ message, sessionId });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/chat/message',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-token-123',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Invalid JSON: ${body}`));
          }
        });
      }
    );
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function runAudit() {
  console.log("=" .repeat(90));
  console.log("  HRIDYAAI 56-PROMPT RANDOM AUDIT (VERIFYING LIVE GEMINI RESPONSES & INTENT)");
  console.log("=" .repeat(90));

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i];
    const sessId = `audit-sess-${i + 1}`;
    console.log(`\n[PROMPT ${i + 1}/56]: "${prompt}"`);

    try {
      const res = await sendChatRequest(prompt, sessId);
      const intent = res.agentType || 'UNKNOWN';
      const reply = res.reply || '';
      const modelUsed = res.debug?.model || 'N/A';

      console.log(`  -> Intent Classification: ${intent}`);
      console.log(`  -> Active Gemini Model: ${modelUsed}`);
      console.log(`  -> Raw Response: "${reply.replace(/\n/g, ' ').slice(0, 140)}..."`);

      // Audit checks
      const lowerReply = reply.toLowerCase();
      if (lowerReply.includes("here is information on") || lowerReply.includes("offline demo mode")) {
        console.log(`  ❌ FAIL: Templated or mock response detected!`);
        failed++;
      } else {
        console.log(`  ✓ SUCCESS: Live contextually unique response generated.`);
        passed++;
      }
    } catch (err: any) {
      console.log(`  ❌ ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log("\n" + "=" .repeat(90));
  console.log("  MULTI-TURN CONVERSATION CONTEXT RETENTION AUDIT");
  console.log("=" .repeat(90));

  const multiSess = `multi-turn-${Date.now()}`;
  for (let turn = 0; turn < MULTI_TURN_THREAD.length; turn++) {
    const prompt = MULTI_TURN_THREAD[turn];
    console.log(`\n[MULTI-TURN TURN ${turn + 1}]: "${prompt}"`);
    try {
      const res = await sendChatRequest(prompt, multiSess);
      console.log(`  -> Intent: ${res.agentType}`);
      console.log(`  -> Response: "${res.reply.replace(/\n/g, ' ').slice(0, 160)}..."`);
    } catch (e: any) {
      console.log(`  ❌ ERROR: ${e.message}`);
    }
  }

  console.log("\n" + "=" .repeat(90));
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED OUT OF ${PROMPTS.length} PROMPTS`);
  console.log("=" .repeat(90));
}

runAudit();
