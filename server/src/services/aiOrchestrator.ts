import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { retrieveRAGContext } from './vectorRagService.js';
import { trackAICall } from './aiTelemetry.js';

export interface OrchestratorResponse {
  sessionId: string;
  reply: string;
  agentType: 'ORCHESTRATOR' | 'DIAGNOSIS' | 'DIET' | 'EXERCISE' | 'EMERGENCY' | 'REPORT' | 'NEARBY' | 'MEDICATION';
  debug?: {
    geminiConnected: boolean;
    apiKeyLoaded: boolean;
    model: string;
    promptSent: string;
    responseReceived: string;
    latencyMs: number;
    dbTimeMs?: number;
    ragTimeMs?: number;
    geminiTimeMs?: number;
    tokenUsage?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
  };
}

const BASE_SYSTEM_PROMPT = `You are HridyaAI, an intelligent healthcare assistant integrated into HridyaDarpan.

Your primary expertise is cardiovascular health, disease prediction, prevention, lifestyle recommendations, medical report interpretation, and patient guidance.

You can also answer general knowledge questions naturally using Gemini.

When a question relates to HridyaDarpan features (predictions, reports, nearby doctors, simulations, explainability, reminders, dashboard data), use the application's internal services before generating a response.

For unrelated topics such as technology, science, programming, sports, mathematics, or general knowledge, answer normally using Gemini.

Never fabricate patient data.

Never claim a medical diagnosis.

For emergencies, advise contacting emergency medical services immediately.`;

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const getGenAI = (): GoogleGenerativeAI | null => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
};

/**
 * Ensures Gemini chat history strictly alternates between 'user' and 'model'
 * and prevents duplicate or trailing 'user' turns.
 */
export function sanitizeGeminiHistory(messages: { role: string; content: string }[]) {
  const sanitized: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (const msg of messages) {
    const role: 'user' | 'model' = msg.role === 'USER' ? 'user' : 'model';
    if (sanitized.length === 0) {
      if (role === 'user') {
        sanitized.push({ role: 'user', parts: [{ text: msg.content }] });
      }
    } else {
      const lastRole = sanitized[sanitized.length - 1].role;
      if (role !== lastRole) {
        sanitized.push({ role, parts: [{ text: msg.content }] });
      } else {
        // Concatenate content if same role appears twice in a row
        sanitized[sanitized.length - 1].parts[0].text += `\n${msg.content}`;
      }
    }
  }

  // Gemini history MUST end with 'model' turn so the new call starts with 'user'
  if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === 'user') {
    sanitized.pop();
  }

  return sanitized;
}

// In-memory clinical context cache with 5-minute TTL to avoid redundant DB joins per chat session
interface CachedPatientContext {
  context: string;
  cachedAt: number;
}
const patientContextCache = new Map<string, CachedPatientContext>();
const PATIENT_CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidatePatientContextCache(userId: string) {
  patientContextCache.delete(userId);
}

/**
 * Structured Intent Classifier
 * Accurately determines agent type and whether patient-specific clinical data is required.
 */
export function classifyIntent(message: string): {
  intent: 'GENERAL' | 'MEDICAL' | 'PREDICTION' | 'REPORT' | 'DIET' | 'EXERCISE' | 'MEDICATION' | 'EMERGENCY' | 'NEARBY';
  agentType: 'ORCHESTRATOR' | 'DIAGNOSIS' | 'DIET' | 'EXERCISE' | 'EMERGENCY' | 'REPORT' | 'NEARBY' | 'MEDICATION';
  isPersonalized: boolean;
} {
  const lower = message.toLowerCase().trim();

  // 1. Emergency intent (immediate priority)
  const emergencyKeywords = ['chest pain', 'left arm pain', 'difficulty breathing', 'dyspnea', 'heart attack', 'crushing chest', 'cpr'];
  if (emergencyKeywords.some(kw => lower.includes(kw))) {
    return { intent: 'EMERGENCY', agentType: 'EMERGENCY', isPersonalized: true };
  }

  // 2. Greetings & conversational openers - NEVER route to NEARBY even if containing "doctor"
  const greetingPatterns = [
    /^(hello|hi|hey|greetings|good morning|good afternoon|good evening|howdy)\b/i,
    /^(hello|hi|hey)\s+(doctor|doc|assistant|hridya|hridaya|ai)\b/i,
    /^(who are you|what are you|what can you do|help me|can you help)\b/i,
  ];
  if (greetingPatterns.some(p => p.test(lower)) && !lower.includes('near') && !lower.includes('find') && !lower.includes('hospital') && !lower.includes('clinic')) {
    return { intent: 'GENERAL', agentType: 'ORCHESTRATOR', isPersonalized: false };
  }

  // 3. Nearby Health Intent (must have explicit location/search context, NOT just the standalone word "doctor")
  const nearbyPatterns = [
    /\b(near\s+me|nearby|closest|locate|find\s+(a\s+)?(doctor|cardiologist|hospital|clinic|pharmacy|chemist|center|care))\b/i,
    /\b(cardiologist|hospital|clinic|pharmacy)\s+near\b/i,
    /\b(directions?\s+to|address\s+of)\s+(hospital|clinic|doctor)\b/i,
  ];
  if (nearbyPatterns.some(p => p.test(lower))) {
    return { intent: 'NEARBY', agentType: 'NEARBY', isPersonalized: false };
  }

  // Check if query asks about the patient's own health records vs general medical knowledge
  const isPersonalized = /\b(my|mine|i\s+have|my\s+risk|my\s+score|my\s+results?|my\s+blood\s+pressure|my\s+bp|my\s+cholesterol|my\s+scan|my\s+report|for\s+me|based\s+on\s+my)\b/i.test(lower);

  // 4. Specific domain intents
  if (/\b(predict|prediction|risk\s+score|probability|shap|feature\s+importance|10-year\s+risk|digital\s+twin)\b/i.test(lower)) {
    return { intent: 'PREDICTION', agentType: 'DIAGNOSIS', isPersonalized };
  }
  if (/\b(report|cbc|lipid\s+panel|blood\s+scan|ecg|electrocardiogram|vitals|lab\s+test|blood\s+test|summarize\s+my\s+ecg|explain\s+my\s+report)\b/i.test(lower)) {
    return { intent: 'REPORT', agentType: 'REPORT', isPersonalized };
  }
  if (/\b(dash\s+diet|heart\s+diet|cardiac\s+diet|low\s+sodium|diet\s+plan|what\s+should\s+i\s+eat|nutrition|potassium\s+foods?)\b/i.test(lower)) {
    return { intent: 'DIET', agentType: 'DIET', isPersonalized };
  }
  if (/\b(exercise|workout|walking|running|steps|gym|cardio|aerobic|target\s+heart\s+rate|active\s+minutes)\b/i.test(lower)) {
    return { intent: 'EXERCISE', agentType: 'EXERCISE', isPersonalized };
  }
  if (/\b(reminder|remind|medication|meds|pill|dose|atorvastatin|metoprolol|aspirin|prescription|amlodipine|statin)\b/i.test(lower)) {
    return { intent: 'MEDICATION', agentType: 'MEDICATION', isPersonalized };
  }
  if (/\b(heart|cardiovascular|blood\s+pressure|hypertension|cholesterol|diabetes|pulse|symptoms|angioplasty|cardiology|arrhythmia|myocardium|artery|vein|attack|stroke)\b/i.test(lower)) {
    return { intent: 'MEDICAL', agentType: 'DIAGNOSIS', isPersonalized };
  }

  return { intent: 'GENERAL', agentType: 'ORCHESTRATOR', isPersonalized: false };
}

export const askHridyaAI = async (
  userId: string,
  sessionId: string | null,
  message: string
): Promise<OrchestratorResponse> => {
  const startTime = performance.now();
  let dbTimeMs = 0;
  let ragTimeMs = 0;
  let geminiTimeMs = 0;

  logger.info(`[HridyaAI] Incoming prompt: "${message.slice(0, 50)}..." from user ${userId}`);

  // Validate user identity exists to enforce user isolation
  const validUserId = userId;
  let activeSessionId = sessionId || '';

  const dbStart = performance.now();
  try {
    // Validate or create session belonging strictly to authenticated user
    let session = null;
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: validUserId },
        select: { id: true },
      });
    }

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId: validUserId,
          title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
        },
        select: { id: true },
      });
    }
    activeSessionId = session.id;
    dbTimeMs = Math.round(performance.now() - dbStart);
  } catch (err: any) {
    logger.warn(`[HridyaAI DB Warning] Session DB handling deferred: ${err.message}`);
    if (!activeSessionId) {
      activeSessionId = `session-${Date.now()}`;
    }
  }

  // 1. Structured Intent Classification
  const classification = classifyIntent(message);
  const { intent, agentType, isPersonalized } = classification;

  // 2. Emergency Mode (Short-circuit for safety)
  if (intent === 'EMERGENCY') {
    const emergencyReply = `**[EMERGENCY MODE ACTIVATED]**
Your symptoms indicate a potential acute cardiovascular event.

**IMMEDIATE CHECKLIST:**
1. Call your local emergency number (like **911** or **112**) immediately.
2. Sit upright in a comfortable position and loosen tight clothing.
3. Do NOT engage in physical activity.
4. If you have been prescribed nitroglycerin and are cleared to use it, do so immediately.

*HridyaDarpan has automatically unlocked emergency care guidelines.*`;

    // Persist emergency message asynchronously
    setImmediate(async () => {
      try {
        await prisma.chatMessage.create({
          data: {
            sessionId: activeSessionId,
            role: 'ASSISTANT',
            content: emergencyReply,
            agentType: 'EMERGENCY',
          },
        });
      } catch (err: any) {
        logger.warn(`[HridyaAI DB Warning] Emergency message DB write deferred: ${err.message}`);
      }
    });

    const latency = Math.round(performance.now() - startTime);
    trackAICall({
      userId: validUserId,
      agentType: 'EMERGENCY',
      model: 'rule-based-emergency',
      latencyMs: latency,
      status: 'SUCCESS',
      ragChunksUsed: 0,
    }).catch(() => {});

    return {
      sessionId: activeSessionId,
      reply: emergencyReply,
      agentType: 'EMERGENCY',
      debug: {
        geminiConnected: false,
        apiKeyLoaded: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        model: 'rule-based-emergency',
        promptSent: 'Emergency filters applied',
        responseReceived: emergencyReply,
        latencyMs: latency,
        dbTimeMs,
        ragTimeMs: 0,
        geminiTimeMs: 0,
      }
    };
  }

  logger.info(`[HridyaAI Routing] Query: "${message.slice(0, 40)}..." -> Classified Intent: ${intent} | Agent: ${agentType} | Personalized: ${isPersonalized}`);

  // 3. Lightweight Clinical Context (Only for personalized medical queries, with 5-minute memory cache)
  let patientContext = "";
  if (isPersonalized && intent !== 'GENERAL' && intent !== 'NEARBY') {
    const cached = patientContextCache.get(validUserId);
    const now = Date.now();
    if (cached && (now - cached.cachedAt) < PATIENT_CACHE_TTL_MS) {
      patientContext = cached.context;
      logger.info(`[HridyaAI Context] Reused cached patient clinical memory for user ${validUserId}`);
    } else {
      const patientDbStart = performance.now();
      try {
        // Fast minimal query: ONLY basic profile, medical history, and 1 latest prediction (NO 5-table join!)
        const user = await prisma.user.findUnique({
          where: { id: validUserId },
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                height: true,
                weight: true,
              }
            },
            medicalHistory: {
              select: {
                smokingStatus: true,
                hasDiabetes: true,
                familyHistory: true,
              }
            },
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                riskLevel: true,
                riskScore: true,
              }
            }
          }
        });

        if (user && user.profile) {
          const p = user.profile;
          const h = user.medicalHistory;
          const age = p.dateOfBirth ? Math.round((Date.now() - p.dateOfBirth.getTime()) / (365 * 24 * 3600 * 1000)) : 'N/A';
          const bmi = (p.height && p.weight) ? (p.weight / ((p.height / 100) ** 2)).toFixed(1) : 'N/A';
          const latestPred = user.predictions?.[0];

          patientContext = `Patient clinical memory:
- Name: ${p.firstName} ${p.lastName} (${p.gender})
- Age: ${age} years | BMI: ${bmi}
- Medical History: Smoking: ${h?.smokingStatus || 'NEVER'}, Diabetes: ${h?.hasDiabetes ? 'YES' : 'NO'}, Family Heart History: ${h?.familyHistory ? 'YES' : 'NO'}
- Latest Cardiovascular Risk: ${latestPred ? `${latestPred.riskLevel} (${latestPred.riskScore.toFixed(0)}%)` : 'No scan recorded yet'}`;

          patientContextCache.set(validUserId, { context: patientContext, cachedAt: now });
          dbTimeMs += Math.round(performance.now() - patientDbStart);
        }
      } catch (err: any) {
        logger.warn(`[HridyaAI DB Warning] Lightweight clinical memory fetch deferred: ${err.message}`);
      }
    }
  }

  // 4. Semantic RAG Retrieval (Only for domain-specific medical queries, bypassed for general/greetings)
  let retrievedGuidelines = "";
  let ragChunksUsed = 0;
  if (intent !== 'GENERAL' && intent !== 'NEARBY') {
    const ragStart = performance.now();
    try {
      const ragResult = await retrieveRAGContext(message);
      retrievedGuidelines = ragResult.context;
      ragChunksUsed = ragResult.chunksUsed;
      ragTimeMs = Math.round(performance.now() - ragStart);
    } catch (err: any) {
      logger.warn(`[HridyaAI RAG Warning] RAG fetch deferred: ${err.message}`);
    }
  }

  // 5. System Instructions Assembly
  let fullSystemInstruction = "";
  if (intent === 'GENERAL') {
    fullSystemInstruction = `You are HridyaAI, a friendly, intelligent, and versatile AI assistant. Answer the user conversationally, accurately, and directly. For general questions, greetings, or casual talk, respond naturally without inserting medical disclaimers or cardiovascular statistics unless requested.`;
  } else {
    let agentSpecificInstruction = "";
    if (intent === 'DIET') {
      agentSpecificInstruction = `You are HridyaAI's specialist Diet Agent. Provide cardiac-friendly diet recommendations, emphasizing DASH/Mediterranean low-sodium nutrition.`;
    } else if (intent === 'EXERCISE') {
      agentSpecificInstruction = `You are HridyaAI's specialist Exercise Agent. Suggest safe aerobic and conditioning routines aligned with cardiovascular guidelines.`;
    } else if (intent === 'REPORT') {
      agentSpecificInstruction = `You are HridyaAI's specialist Report Agent. Help the patient interpret clinical lab markers (cholesterol, glucose, ECG).`;
    } else if (intent === 'NEARBY') {
      agentSpecificInstruction = `You are HridyaAI's specialist Nearby Health Agent. Guide the patient on locating nearby clinics, hospitals, or cardiologists.`;
    } else if (intent === 'PREDICTION' || intent === 'MEDICAL') {
      agentSpecificInstruction = `You are HridyaAI's specialist Diagnosis Agent. Explain cardiovascular risk factors, blood pressure metrics, and preventive guidelines clearly.`;
    } else if (intent === 'MEDICATION') {
      agentSpecificInstruction = `You are HridyaAI's specialist Medication Agent. Provide educational context on standard cardiovascular medications.`;
    } else {
      agentSpecificInstruction = `You are HridyaAI, an intelligent healthcare assistant.`;
    }

    fullSystemInstruction = `${BASE_SYSTEM_PROMPT}

Specialist Agent Context: ${agentSpecificInstruction}
${patientContext ? `\n${patientContext}\n` : ''}${retrievedGuidelines ? `\nClinical Reference Guidelines:\n${retrievedGuidelines}` : ''}`;
  }

  // 6. Retrieve Recent History for Session (Max 6 messages for token efficiency and speed)
  let pastMessages: any[] = [];
  try {
    pastMessages = await prisma.chatMessage.findMany({
      where: {
        sessionId: activeSessionId,
      },
      orderBy: { createdAt: 'asc' },
      take: 6,
    });
  } catch (err: any) {
    logger.warn(`[HridyaAI DB Warning] History fetch deferred: ${err.message}`);
  }

  const chatHistory = sanitizeGeminiHistory(pastMessages);

  // 7. Invoke Gemini API (Real Gemini Models)
  const genAI = getGenAI();
  if (!genAI) {
    throw new Error('Gemini API is not configured on server (GEMINI_API_KEY missing).');
  }

  const candidateModels = Array.from(new Set([
    GEMINI_MODEL,
    'gemini-3.6-flash',
    'gemini-2.5-flash',
  ]));

  let reply = "";
  let rawGeminiText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let activeModelName = GEMINI_MODEL;
  let lastError: any = null;

  const geminiStart = performance.now();

  for (const mName of candidateModels) {
    try {
      activeModelName = mName;
      const model = genAI.getGenerativeModel({
        model: mName,
        systemInstruction: fullSystemInstruction,
      });

      try {
        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(message);
        rawGeminiText = result.response.text();
        const usage = result.response.usageMetadata;
        if (usage) {
          inputTokens = usage.promptTokenCount || 0;
          outputTokens = usage.candidatesTokenCount || 0;
        }
      } catch (historyErr: any) {
        logger.warn(`[HridyaAI] History rejected by model ${mName} (${historyErr.message}). Falling back to direct generation.`);
        const result = await model.generateContent(message);
        rawGeminiText = result.response.text();
      }

      reply = rawGeminiText;
      geminiTimeMs = Math.round(performance.now() - geminiStart);
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      logger.warn(`[HridyaAI] Model "${mName}" invocation error: ${err.message}`);
    }
  }

  if (lastError && !reply) {
    logger.error(`[HridyaAI Error] Gemini API execution failed across candidate models: ${lastError.message}`);
    throw new Error(`Gemini API Error: ${lastError.message}`);
  }

  // 8. Background Turn Persistence (Non-blocking response)
  setImmediate(async () => {
    try {
      await prisma.chatMessage.createMany({
        data: [
          {
            sessionId: activeSessionId,
            role: 'USER',
            content: message,
            agentType: 'ORCHESTRATOR',
          },
          {
            sessionId: activeSessionId,
            role: 'ASSISTANT',
            content: reply,
            agentType,
          },
        ],
      });
    } catch (err: any) {
      logger.warn(`[HridyaAI DB Warning] Messages DB write deferred: ${err.message}`);
    }
  });

  const totalLatencyMs = Math.round(performance.now() - startTime);
  logger.info(`[HridyaAI Complete] Session: ${activeSessionId} | Total: ${totalLatencyMs}ms (DB: ${dbTimeMs}ms, RAG: ${ragTimeMs}ms, Gemini: ${geminiTimeMs}ms) | Intent: ${intent}`);

  trackAICall({
    userId: validUserId,
    agentType,
    model: activeModelName,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs: totalLatencyMs,
    ragChunksUsed,
    status: 'SUCCESS',
  }).catch(() => {});

  return {
    sessionId: activeSessionId,
    reply,
    agentType,
    debug: {
      geminiConnected: true,
      apiKeyLoaded: !!genAI,
      model: activeModelName,
      promptSent: fullSystemInstruction,
      responseReceived: reply,
      latencyMs: totalLatencyMs,
      dbTimeMs,
      ragTimeMs,
      geminiTimeMs,
      tokenUsage: {
        promptTokenCount: inputTokens,
        candidatesTokenCount: outputTokens,
        totalTokenCount: inputTokens + outputTokens,
      }
    }
  };
};

export function getHridyaAIClinicalFallback(message: string, agentType: string): string {
  throw new Error("Hardcoded fallbacks have been removed. Every query MUST be processed by live Gemini API.");
}
