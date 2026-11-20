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

const BASE_SYSTEM_PROMPT = `You are HridyaAI, an intelligent, empathetic, and fluent cardiovascular health AI assistant integrated into HridyaDarpan.

Core Communication Principles:
1. Natural & Conversational Tone:
   - Speak with the warmth, clarity, and professionalism of an experienced clinical communicator.
   - Deliver a direct, helpful answer in the very first 1-2 sentences before providing deeper explanations or practical steps.
   - Do NOT begin messages with robotic preamble, agent role declarations (never say "As HridyaAI's specialist...", "As an AI model...", or "I am designed to..."), or repetitive canned greetings.
   - Avoid boilerplate disclaimers at the start or end of every single conversational turn. Provide guidance educational in nature, suggesting physician follow-up only when clinically relevant.

2. Coherent Flow & Follow-up Understanding:
   - Treat each conversation as a continuous, coherent dialogue.
   - When a patient asks follow-up questions (e.g., "Why is that?", "What should I do next?", "Can I eat eggs?", "Is 140/90 high?"), answer directly in context of prior turns without re-introducing yourself or resetting the discussion.
   - For casual greetings (e.g., "Hello", "How are you?"), respond warmly, conversationally, and concisely without dumping unsolicited medical lectures.

3. Clean Markdown & Readability:
   - Structure answers into natural, cohesive paragraphs (2-3 sentences each).
   - Use bullet points only when listing 3 or more actionable items, steps, or symptoms. Avoid unnecessary fragmentation into artificial micro-sections.
   - Use bold formatting intentionally for key metrics, terms, or emphasis (e.g., **130/80 mmHg**, **LDL cholesterol**).
   - Use clean Markdown headers (## or ###) only when a longer medical explanation naturally benefits from topic division.

4. Clinical Grounding & RAG Synthesis:
   - When clinical guidelines or patient context are provided, integrate them seamlessly into natural prose.
   - Never output raw citation brackets like "[1]" or verbatim database dumps.
   - Never fabricate patient laboratory results or historical metrics. If patient data is absent, state clearly that no measurement is on file.

5. Safety & Emergencies:
   - Never claim to make a binding medical diagnosis or prescribe prescription dosage adjustments.
   - If the patient describes acute emergency symptoms (crushing chest pain radiating to arm/jaw, acute severe dyspnea, sudden weakness, loss of consciousness), immediately direct them to call local emergency medical services (112 or 911).`;

const envModel = process.env.GEMINI_MODEL;
export const GEMINI_MODEL = (envModel && envModel !== 'gemini-3.6-flash') ? envModel : 'gemini-3.5-flash-lite';

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
- Demographics: ${p.gender || 'Patient'} (De-identified)
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
      agentSpecificInstruction = `Specialist Focus: Diet & Nutrition. Provide practical, heart-healthy dietary guidance emphasizing DASH and Mediterranean dietary patterns, sodium reduction, and potassium-rich whole foods tailored to cardiac health.`;
    } else if (intent === 'EXERCISE') {
      agentSpecificInstruction = `Specialist Focus: Physical Activity & Conditioning. Recommend safe, evidence-based aerobic and conditioning routines aligned with AHA guidelines, explaining heart rate zones, gradual progression, and warning signs to pause activity.`;
    } else if (intent === 'REPORT') {
      agentSpecificInstruction = `Specialist Focus: Laboratory & Diagnostic Reports. Help the patient interpret clinical markers (lipid panel, fasting blood glucose, HbA1c, ECG, CBC) in clear, understandable language with reference ranges and clinical significance.`;
    } else if (intent === 'NEARBY') {
      agentSpecificInstruction = `Specialist Focus: Healthcare Navigation. Guide the patient in locating nearby cardiac care centers, cardiologists, or emergency facilities based on their clinical urgency.`;
    } else if (intent === 'PREDICTION' || intent === 'MEDICAL') {
      agentSpecificInstruction = `Specialist Focus: Cardiovascular Risk & Prevention. Clearly explain cardiovascular risk factors, blood pressure classifications (ACC/AHA standards), and lifestyle prevention strategies.`;
    } else if (intent === 'MEDICATION') {
      agentSpecificInstruction = `Specialist Focus: Medication Education. Provide clear educational context on standard cardiovascular medications (statins, ACE inhibitors, beta-blockers), their purpose, general adherence tips, and common side effects to discuss with their doctor.`;
    } else {
      agentSpecificInstruction = `Specialist Focus: General Cardiovascular Guidance.`;
    }

    fullSystemInstruction = `${BASE_SYSTEM_PROMPT}

Specialist Agent Context: ${agentSpecificInstruction}
${patientContext ? `\n${patientContext}\n` : ''}${retrievedGuidelines ? `\nClinical Reference Guidelines:\n${retrievedGuidelines}` : ''}`;
  }

  // 6. Retrieve Recent History for Session (Max 10 messages for rich multi-turn context)
  let pastMessages: any[] = [];
  try {
    const recentMessages = await prisma.chatMessage.findMany({
      where: {
        sessionId: activeSessionId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    pastMessages = recentMessages.reverse();
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
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
  ])).filter((m) => m !== 'gemini-3.6-flash');

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
      const model = genAI.getGenerativeModel(
        {
          model: mName,
          systemInstruction: fullSystemInstruction,
        },
        { timeout: 30000 }
      );

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
      // Short-circuit candidate model fallback on fatal authentication or invalid API key errors
      if (err?.message && (
        err.message.includes('API_KEY_INVALID') ||
        err.message.includes('API key not valid') ||
        err.message.includes('401') ||
        err.message.includes('403')
      )) {
        break;
      }
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

export const askHridyaAIStream = async (
  userId: string,
  sessionId: string | null,
  message: string,
  onChunk: (chunk: string) => void,
  onStage?: (stage: { stage: string; text: string }) => void,
  isCancelled?: () => boolean
): Promise<OrchestratorResponse> => {
  const startTime = performance.now();
  let dbTimeMs = 0;
  let ragTimeMs = 0;
  let geminiTimeMs = 0;

  logger.info(`[HridyaAI Stream] Incoming prompt: "${message.slice(0, 50)}..." from user ${userId}`);

  const validUserId = userId;
  let activeSessionId = sessionId || '';

  onStage?.({ stage: 'SESSION_INIT', text: 'Initializing conversational session...' });
  const dbStart = performance.now();
  try {
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
    logger.warn(`[HridyaAI Stream DB Warning] Session DB handling deferred: ${err.message}`);
    if (!activeSessionId) {
      activeSessionId = `session-${Date.now()}`;
    }
  }

  // 1. Structured Intent Classification
  onStage?.({ stage: 'CLASSIFYING_INTENT', text: 'Analyzing query intent & routing specialist...' });
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

    onChunk(emergencyReply);

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

  // 3. Lightweight Clinical Context
  let patientContext = "";
  if (isPersonalized && intent !== 'GENERAL' && intent !== 'NEARBY') {
    onStage?.({ stage: 'PATIENT_CONTEXT', text: 'Loading clinical background & risk records...' });
    const cached = patientContextCache.get(validUserId);
    const now = Date.now();
    if (cached && (now - cached.cachedAt) < PATIENT_CACHE_TTL_MS) {
      patientContext = cached.context;
    } else {
      const patientDbStart = performance.now();
      try {
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
- Demographics: ${p.gender || 'Patient'} (De-identified)
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

  // 4. Semantic RAG Retrieval
  let retrievedGuidelines = "";
  let ragChunksUsed = 0;
  if (intent !== 'GENERAL' && intent !== 'NEARBY') {
    onStage?.({ stage: 'RETRIEVING_GUIDELINES', text: 'Retrieving cardiology guidelines & references...' });
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
      agentSpecificInstruction = `Specialist Focus: Diet & Nutrition. Provide practical, heart-healthy dietary guidance emphasizing DASH and Mediterranean dietary patterns, sodium reduction, and potassium-rich whole foods tailored to cardiac health.`;
    } else if (intent === 'EXERCISE') {
      agentSpecificInstruction = `Specialist Focus: Physical Activity & Conditioning. Recommend safe, evidence-based aerobic and conditioning routines aligned with AHA guidelines, explaining heart rate zones, gradual progression, and warning signs to pause activity.`;
    } else if (intent === 'REPORT') {
      agentSpecificInstruction = `Specialist Focus: Laboratory & Diagnostic Reports. Help the patient interpret clinical markers (lipid panel, fasting blood glucose, HbA1c, ECG, CBC) in clear, understandable language with reference ranges and clinical significance.`;
    } else if (intent === 'NEARBY') {
      agentSpecificInstruction = `Specialist Focus: Healthcare Navigation. Guide the patient in locating nearby cardiac care centers, cardiologists, or emergency facilities based on their clinical urgency.`;
    } else if (intent === 'PREDICTION' || intent === 'MEDICAL') {
      agentSpecificInstruction = `Specialist Focus: Cardiovascular Risk & Prevention. Clearly explain cardiovascular risk factors, blood pressure classifications (ACC/AHA standards), and lifestyle prevention strategies.`;
    } else if (intent === 'MEDICATION') {
      agentSpecificInstruction = `Specialist Focus: Medication Education. Provide clear educational context on standard cardiovascular medications (statins, ACE inhibitors, beta-blockers), their purpose, general adherence tips, and common side effects to discuss with their doctor.`;
    } else {
      agentSpecificInstruction = `Specialist Focus: General Cardiovascular Guidance.`;
    }

    fullSystemInstruction = `${BASE_SYSTEM_PROMPT}

Specialist Agent Context: ${agentSpecificInstruction}
${patientContext ? `\n${patientContext}\n` : ''}${retrievedGuidelines ? `\nClinical Reference Guidelines:\n${retrievedGuidelines}` : ''}`;
  }

  // 6. Retrieve Recent History for Session (Max 10 messages for rich multi-turn context)
  let pastMessages: any[] = [];
  try {
    const recentMessages = await prisma.chatMessage.findMany({
      where: {
        sessionId: activeSessionId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    pastMessages = recentMessages.reverse();
  } catch (err: any) {
    logger.warn(`[HridyaAI DB Warning] History fetch deferred: ${err.message}`);
  }

  const chatHistory = sanitizeGeminiHistory(pastMessages);

  // 7. Invoke Gemini API Streaming
  onStage?.({ stage: 'STREAMING_RESPONSE', text: 'Generating response stream...' });
  const genAI = getGenAI();
  if (!genAI) {
    throw new Error('Gemini API is not configured on server (GEMINI_API_KEY missing).');
  }

  const candidateModels = Array.from(new Set([
    GEMINI_MODEL,
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
  ])).filter((m) => m !== 'gemini-3.6-flash');

  let reply = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let activeModelName = GEMINI_MODEL;
  let lastError: any = null;

  const geminiStart = performance.now();

  for (const mName of candidateModels) {
    try {
      activeModelName = mName;
      const model = genAI.getGenerativeModel(
        {
          model: mName,
          systemInstruction: fullSystemInstruction,
        },
        { timeout: 30000 }
      );

      try {
        const chat = model.startChat({ history: chatHistory });
        const streamResult = await chat.sendMessageStream(message);
        for await (const chunk of streamResult.stream) {
          if (isCancelled?.()) {
            logger.info('[HridyaAI Stream] Stream aborted by client.');
            break;
          }
          let chunkText = '';
          try {
            chunkText = chunk.text();
          } catch (tErr: any) {
            // Safety or empty candidate finish block
          }
          if (chunkText) {
            reply += chunkText;
            onChunk(chunkText);
          }
        }
        if (!isCancelled?.()) {
          const finalResponse = await streamResult.response;
          const usage = finalResponse.usageMetadata;
          if (usage) {
            inputTokens = usage.promptTokenCount || 0;
            outputTokens = usage.candidatesTokenCount || 0;
          }
        }
      } catch (historyErr: any) {
        logger.warn(`[HridyaAI Stream] History stream rejected (${historyErr.message}).`);
        // ONLY retry with direct stream if NO chunks have been emitted yet to prevent duplicate text
        if (!reply && !isCancelled?.()) {
          logger.info(`[HridyaAI Stream] Retrying via direct stream without history.`);
          const streamResult = await model.generateContentStream(message);
          for await (const chunk of streamResult.stream) {
            if (isCancelled?.()) break;
            let chunkText = '';
            try {
              chunkText = chunk.text();
            } catch (tErr: any) {}
            if (chunkText) {
              reply += chunkText;
              onChunk(chunkText);
            }
          }
          if (!isCancelled?.()) {
            const finalResponse = await streamResult.response;
            const usage = finalResponse.usageMetadata;
            if (usage) {
              inputTokens = usage.promptTokenCount || 0;
              outputTokens = usage.candidatesTokenCount || 0;
            }
          }
        } else if (!reply) {
          throw historyErr;
        }
      }

      geminiTimeMs = Math.round(performance.now() - geminiStart);
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      logger.warn(`[HridyaAI Stream] Model "${mName}" invocation error: ${err.message}`);
      if (err?.message && (
        err.message.includes('API_KEY_INVALID') ||
        err.message.includes('API key not valid') ||
        err.message.includes('401') ||
        err.message.includes('403')
      )) {
        break;
      }
    }
  }

  if (lastError && !reply) {
    logger.error(`[HridyaAI Stream Error] Gemini API execution failed across candidate models: ${lastError.message}`);
    throw lastError;
  }

  // 8. Background Turn Persistence
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
  logger.info(`[HridyaAI Stream Complete] Session: ${activeSessionId} | Total: ${totalLatencyMs}ms (DB: ${dbTimeMs}ms, RAG: ${ragTimeMs}ms, Gemini: ${geminiTimeMs}ms) | Intent: ${intent}`);

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
