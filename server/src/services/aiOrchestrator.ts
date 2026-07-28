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

export const askHridyaAI = async (
  userId: string,
  sessionId: string | null,
  message: string
): Promise<OrchestratorResponse> => {
  console.log("NEW ORCHESTRATOR ACTIVE");
  const startTime = performance.now();
  logger.info(`[HridyaAI DEBUG] Incoming prompt: "${message}" from user ${userId}`);

  // Ensure user exists in database to prevent FK constraint issues
  let validUserId = userId;
  let activeSessionId = sessionId || `session-${Date.now()}`;
  let userMessageRecordId: string | null = null;

  try {
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) {
        validUserId = defaultUser.id;
      }
    }

    // 1. Fetch or create chat session
    let session;
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: validUserId },
      });
    }

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId: validUserId,
          title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
        },
      });
    }
    activeSessionId = session.id;

    // Save patient message in database
    const userMessageRecord = await prisma.chatMessage.create({
      data: {
        sessionId: activeSessionId,
        role: 'USER',
        content: message,
        agentType: 'ORCHESTRATOR',
      },
    });
    userMessageRecordId = userMessageRecord.id;
  } catch (err: any) {
    logger.warn(`[HridyaAI DB Warning] Session DB logging deferred: ${err.message}`);
  }

  // 2. INPUT SAFETY FILTER (Emergency check)
  const emergencyKeywords = ['chest pain', 'left arm pain', 'difficulty breathing', 'dyspnea', 'heart attack', 'crushing chest', 'cpr'];
  const isEmergency = emergencyKeywords.some(keyword => message.toLowerCase().includes(keyword));

  if (isEmergency) {
    const emergencyReply = `**[EMERGENCY MODE ACTIVATED]**
    Your symptoms indicate a potential acute cardiovascular event.
    
    **IMMEDIATE CHECKLIST:**
    1. Call your local emergency number (like **911** or **112**) immediately.
    2. Sit upright in a comfortable position and loosen tight clothing.
    3. Do NOT engage in physical activity.
    4. If you have been prescribed nitroglycerin and are cleared to use it, do so immediately.
    
    *HridyaDarpan has automatically unlocked emergency care guidelines.*`;

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
      }
    };
  }

  // 3. MULTI-INTENT CLASSIFIER
  const hasMatch = (keywords: string[]) => {
    return keywords.some(keyword => {
      const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(message);
    });
  };

  let intent: 'GENERAL' | 'MEDICAL' | 'PREDICTION' | 'REPORT' | 'DIET' | 'EXERCISE' | 'MEDICATION' | 'EMERGENCY' | 'NEARBY' = 'GENERAL';

  if (hasMatch(['predict', 'prediction', 'risk score', 'probability', 'shap', 'feature importance', '10-year risk', 'digital twin'])) {
    intent = 'PREDICTION';
  } else if (hasMatch(['report', 'cbc', 'lipid', 'blood scan', 'ecg', 'electrocardiogram', 'vitals', 'lab test', 'blood test', 'summarize my ecg', 'explain my report'])) {
    intent = 'REPORT';
  } else if (hasMatch(['dash diet', 'heart diet', 'cardiac diet', 'low sodium diet', 'bp diet', 'hypertension diet', 'cardiovascular nutrition', 'potassium diet'])) {
    intent = 'DIET';
  } else if (hasMatch(['exercise', 'walk', 'run', 'gym', 'workout', 'steps', 'cardio', 'aerobic', 'fitness'])) {
    intent = 'EXERCISE';
  } else if (hasMatch(['hospital', 'clinic', 'pharmacy', 'nearby', 'location', 'doctor', 'cardiologist', 'chemist'])) {
    intent = 'NEARBY';
  } else if (hasMatch(['reminder', 'remind', 'medication', 'meds', 'pill', 'dose', 'atorvastatin', 'metoprolol', 'aspirin', 'prescription'])) {
    intent = 'MEDICATION';
  } else if (hasMatch(['heart', 'cardiovascular', 'blood pressure', 'hypertension', 'cholesterol', 'diabetes', 'pulse', 'symptoms', 'angioplasty', 'cardiology', 'arrhythmia', 'myocardium', 'artery', 'vein', 'attack', 'stroke'])) {
    intent = 'MEDICAL';
  } else {
    intent = 'GENERAL';
  }

  // Map internal intent to API AgentType
  let agentType: 'ORCHESTRATOR' | 'DIAGNOSIS' | 'DIET' | 'EXERCISE' | 'EMERGENCY' | 'REPORT' | 'NEARBY' | 'MEDICATION' = 'ORCHESTRATOR';
  if (intent === 'PREDICTION' || intent === 'MEDICAL') agentType = 'DIAGNOSIS';
  else if (intent === 'REPORT') agentType = 'REPORT';
  else if (intent === 'DIET') agentType = 'DIET';
  else if (intent === 'EXERCISE') agentType = 'EXERCISE';
  else if (intent === 'NEARBY') agentType = 'NEARBY';
  else if (intent === 'MEDICATION') agentType = 'MEDICATION';
  else if ((intent as string) === 'EMERGENCY') agentType = 'EMERGENCY';
  else agentType = 'ORCHESTRATOR';

  const isMedicalIntent = intent !== 'GENERAL';
  logger.info(`[HridyaAI Routing] Query: "${message}" -> Classified Intent: ${intent} | Medical Context Required: ${isMedicalIntent}`);

  let patientContext = "";
  let retrievedGuidelines = "";
  let ragChunksUsed = 0;

  if (isMedicalIntent) {
    // 4. MEDICAL CONTEXT ENGINE
    try {
      const user = await prisma.user.findUnique({
        where: { id: validUserId },
        include: {
          profile: true,
          medicalHistory: true,
          predictions: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { factors: true }
          },
          lifestyleLogs: {
            orderBy: { date: 'desc' },
            take: 5
          },
          dietPlans: {
            where: { isActive: true },
            take: 1
          },
          exercisePlans: {
            where: { isActive: true },
            take: 1
          },
          doctorNotes: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { doctor: { include: { profile: true } } }
          }
        }
      });

      if (user && user.profile) {
        const p = user.profile;
        const h = user.medicalHistory;
        const avgSteps = user.lifestyleLogs.length > 0 
          ? Math.round(user.lifestyleLogs.reduce((sum, item) => sum + item.stepsCount, 0) / user.lifestyleLogs.length)
          : 0;

        patientContext = `Patient clinical memory:
        - Name / Gender: ${p.firstName} ${p.lastName} (${p.gender})
        - Age / BMI: ${Math.round((Date.now() - p.dateOfBirth.getTime()) / (365 * 24 * 3600 * 1000))} years / ${(p.weight / ((p.height / 100) ** 2)).toFixed(1)}
        - Medical history: Smoking: ${h?.smokingStatus || 'NEVER'}, Diabetes: ${h?.hasDiabetes ? 'YES' : 'NO'}, Family Heart History: ${h?.familyHistory ? 'YES' : 'NO'}
        - Latest Risk Predictions: ${user.predictions.map(pr => `${pr.riskLevel} (${pr.riskScore.toFixed(0)}% score)`).join(' | ') || 'None'}
        - Average logged steps: ${avgSteps} steps/day`;
      }
    } catch (err: any) {
      logger.warn(`[HridyaAI DB Warning] Clinical memory fetch deferred: ${err.message}`);
    }

    // 5. SEMANTIC RAG RETRIEVAL (Only for medical/cardiac queries)
    try {
      const ragResult = await retrieveRAGContext(message);
      retrievedGuidelines = ragResult.context;
      ragChunksUsed = ragResult.chunksUsed;
    } catch (err: any) {
      logger.warn(`[HridyaAI RAG Warning] RAG fetch deferred: ${err.message}`);
    }
  }

  // 7. COMPILE SYSTEM INSTRUCTION
  let fullSystemInstruction = "";

  if (intent === 'GENERAL') {
    fullSystemInstruction = `You are HridyaAI, a friendly, intelligent, and versatile AI assistant (like ChatGPT). Answer general user questions naturally, accurately, conversationally, and directly. Do NOT mention blood pressure, heart health, medical disclaimers, or clinical parameters unless the user explicitly asks about health.`;
  } else {
    let agentSystemInstruction = "";
    if (intent === 'DIET') {
      agentSystemInstruction = `You are HridyaAI's specialist Diet Agent. Provide cardiac-friendly diet guides. Recommend low-sodium DASH or Mediterranean foods.`;
    } else if (intent === 'EXERCISE') {
      agentSystemInstruction = `You are HridyaAI's specialist Exercise Agent. Suggest cardiorespiratory workouts (aerobic, brisk walk).`;
    } else if (intent === 'REPORT') {
      agentSystemInstruction = `You are HridyaAI's specialist Report Agent. Help the patient interpret clinical lab metrics (cholesterol, glucose, ECG).`;
    } else if (intent === 'NEARBY') {
      agentSystemInstruction = `You are HridyaAI's specialist Nearby Health Agent. Advise patient on locating cardiologists and testing clinics.`;
    } else if (intent === 'PREDICTION' || intent === 'MEDICAL') {
      agentSystemInstruction = `You are HridyaAI's specialist Diagnosis Agent. Explain cardiovascular risk factors, blood pressure indices, and preventive measures.`;
    } else if (intent === 'MEDICATION') {
      agentSystemInstruction = `You are HridyaAI's specialist Medication Agent. Provide educational information on common cardiac medications.`;
    } else {
      agentSystemInstruction = `You are HridyaAI, a helpful healthcare and conversational AI assistant.`;
    }

    fullSystemInstruction = `${BASE_SYSTEM_PROMPT}

Specialist Agent Context: ${agentSystemInstruction}

Patient Memory:
${patientContext}

Clinical Reference Guidelines:
${retrievedGuidelines}`;
  }

  // STEP 4 - VERIFY AI ORCHESTRATOR LOGS
  console.log('\n========================================================');
  console.log('[STEP 4 - AI ORCHESTRATOR CLASSIFICATION]');
  console.log(`Incoming Prompt: "${message}"`);
  console.log(`Detected Intent: ${intent}`);
  console.log(`Selected Agent:  ${agentType}`);
  console.log(`Selected Model:  ${GEMINI_MODEL}`);
  console.log(`System Prompt:   ${fullSystemInstruction.slice(0, 120)}...`);
  console.log(`User Prompt:     "${message}"`);
  console.log('========================================================\n');

  // 8. CONVERSATION HISTORY RETRIEVAL & ALTERNATION SANITIZATION
  let pastMessages: any[] = [];
  try {
    pastMessages = await prisma.chatMessage.findMany({
      where: {
        sessionId: activeSessionId,
        ...(userMessageRecordId ? { id: { not: userMessageRecordId } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
  } catch (err: any) {
    logger.warn(`[HridyaAI DB Warning] History fetch deferred: ${err.message}`);
  }

  const chatHistory = sanitizeGeminiHistory(pastMessages);

  // 9. CALL GEMINI API WITH REAL GEMINI MODELS (NO HARDCODED OVERWRITE)
  let reply = "";
  let rawGeminiText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let callStatus: 'SUCCESS' | 'FAILED' | 'HALLUCINATION_FLAGGED' = 'SUCCESS';
  let errorMsg: string | undefined;
  let activeModelName = GEMINI_MODEL;
  
  const genAI = getGenAI();

  if (!genAI) {
    throw new Error('Gemini API is not configured on server (GEMINI_API_KEY missing).');
  }

  const candidateModels = Array.from(new Set([
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-3.6-flash',
    GEMINI_MODEL,
  ]));

  let lastError: any = null;

  for (const mName of candidateModels) {
    try {
      activeModelName = mName;

      // STEP 5 - VERIFY GEMINI BEFORE CALL
      console.log('\n========================================================');
      console.log('[STEP 5 - GEMINI API GENERATE CONTENT REQUEST]');
      console.log(`MODEL NAME:    ${mName}`);
      console.log(`SYSTEM PROMPT: ${fullSystemInstruction.slice(0, 150)}...`);
      console.log(`USER PROMPT:   "${message}"`);
      console.log('========================================================\n');

      const model = genAI.getGenerativeModel({
        model: mName,
        systemInstruction: fullSystemInstruction,
      });

      // Try with history first, fallback to generateContent if history rejected
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
        logger.warn(`[HridyaAI] Chat history rejected by Gemini (${historyErr.message}), trying direct content generation...`);
        const result = await model.generateContent(message);
        rawGeminiText = result.response.text();
      }

      reply = rawGeminiText;

      // STEP 5 & STEP 6 - VERIFY GEMINI AFTER CALL & RESPONSE PROCESSING
      console.log('\n========================================================');
      console.log('[STEP 5 - RAW GEMINI RESPONSE WITHOUT ANY MODIFICATION]');
      console.log(rawGeminiText);
      console.log('========================================================');
      console.log('[STEP 6 - RESPONSE PROCESSING VERIFICATION]');
      console.log(`Raw Gemini Text:    ${rawGeminiText.slice(0, 100)}...`);
      console.log(`Processed Text:     ${reply.slice(0, 100)}...`);
      console.log(`Formatted Markdown: VERIFIED (Exact raw string passed)`);
      console.log(`JSON Response:      { reply: "${reply.slice(0, 50)}..." }`);
      console.log('Nothing has overwritten or altered the Gemini response.');
      console.log('========================================================\n');

      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      logger.warn(`[HridyaAI DEBUG] Model "${mName}" execution error: ${err.message}`);
    }
  }

  if (lastError && !reply) {
    logger.error(`[HridyaAI Error] Gemini API execution failed: ${lastError.message}`);
    throw new Error(`Gemini API Error: ${lastError.message}`);
  }

  // Save Assistant message in DB
  try {
    await prisma.chatMessage.create({
      data: {
        sessionId: activeSessionId,
        role: 'ASSISTANT',
        content: reply,
        agentType,
      },
    });
  } catch (err: any) {
    logger.warn(`[HridyaAI DB Warning] Assistant message DB write deferred: ${err.message}`);
  }

  const latencyMs = Math.round(performance.now() - startTime);
  logger.info(`[HridyaAI] Session ID: ${activeSessionId} | Latency: ${latencyMs}ms | Status: ${callStatus}`);

  trackAICall({
    userId: validUserId,
    agentType,
    model: activeModelName,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs,
    ragChunksUsed,
    status: callStatus,
    errorMessage: errorMsg,
  }).catch(() => {});

  return {
    sessionId: activeSessionId,
    reply,
    agentType,
    debug: {
      geminiConnected: (callStatus as string) !== 'FAILED',
      apiKeyLoaded: !!genAI,
      model: GEMINI_MODEL,
      promptSent: fullSystemInstruction,
      responseReceived: reply,
      latencyMs,
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
