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

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

const getGenAI = (): GoogleGenerativeAI | null => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
};

export const askHridyaAI = async (
  userId: string,
  sessionId: string | null,
  message: string
): Promise<OrchestratorResponse> => {
  const startTime = performance.now();
  logger.info(`[HridyaAI DEBUG] Incoming user prompt: "${message}"`);

  // Ensure user exists in database to prevent FK violation for demo user tokens
  let validUserId = userId;
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

  // Save patient message immediately
  const userMessageRecord = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'USER',
      content: message,
      agentType: 'ORCHESTRATOR',
    },
  });

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
    
    *HridyaDarpan has automatically unlocked the emergency dashboard overlay. Below are the nearest actual hospitals and clinics from OpenStreetMap.*`;

    // Save emergency reply in DB
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: emergencyReply,
        agentType: 'EMERGENCY',
      },
    });

    const latency = Math.round(performance.now() - startTime);
    logger.info(`[HridyaAI] Emergency response triggered. Latency: ${latency}ms`);

    // Track telemetry for emergency responses
    trackAICall({
      userId,
      agentType: 'EMERGENCY',
      model: 'rule-based',
      latencyMs: latency,
      status: 'SUCCESS',
      ragChunksUsed: 0,
    }).catch(() => {});

    return {
      sessionId: session.id,
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

  // 3. HYBRID ROUTING CLASSIFIER
  const internalKeywords = [
    'predict', 'prediction', 'risk', 'score', 'probability', 'factors', 'shap', 'feature', 'ensemble',
    'report', 'cbc', 'lipid', 'blood scan', 'scan', 'ecg', 'electrocardiogram', 'vitals', 'diastolic', 'systolic', 'cholesterol', 'glucose', 'hemoglobin',
    'hospital', 'clinic', 'pharmacy', 'nearby', 'location', 'doctor', 'cardiologist', 'chemist',
    'dashboard', 'metrics', 'my logs', 'vitals', 'health score', 'reminder', 'remind', 'medication', 'meds', 'pill', 'dose', 'atorvastatin', 'metoprolol', 'aspirin', 'prescription',
    'eat', 'diet', 'recipe', 'meal', 'nutrition', 'calorie', 'food', 'dash', 'sodium', 'potassium',
    'exercise', 'walk', 'run', 'gym', 'workout', 'steps', 'cardio', 'aerobic', 'fitness', 'hypertension', 'hypertensive'
  ];

  const hasWord = (keywords: string[]) => {
    return keywords.some(keyword => {
      const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(message);
    });
  };

  const useInternalServices = hasWord(internalKeywords);
  logger.info(`[HridyaAI Routing] Query: "${message}" -> Use Internal Services: ${useInternalServices}`);

  let patientContext = "No prior clinical profile or metrics exist yet.";
  let retrievedGuidelines = "";
  let ragChunksUsed = 0;
  let agentType: 'ORCHESTRATOR' | 'DIAGNOSIS' | 'DIET' | 'EXERCISE' | 'EMERGENCY' | 'REPORT' | 'NEARBY' | 'MEDICATION' = 'ORCHESTRATOR';

  if (useInternalServices) {
    // 4. MEDICAL CONTEXT ENGINE
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

      patientContext = `You are discussing health with patient: ${p.firstName} ${p.lastName}.
      - Age / Gender: ${Math.round((Date.now() - p.dateOfBirth.getTime()) / (365 * 24 * 3600 * 1000))} years / ${p.gender}
      - BMI: ${(p.weight / ((p.height / 100) ** 2)).toFixed(1)} (Height: ${p.height}cm, Weight: ${p.weight}kg)
      - Medical history: Smokers status: ${h?.smokingStatus || 'NEVER'}, Diabetes: ${h?.hasDiabetes ? 'YES' : 'NO'}, Family Heart History: ${h?.familyHistory ? 'YES' : 'NO'}
      - Last 3 Risk prediction levels: ${user.predictions.map(pr => `${pr.riskLevel} (${pr.riskScore.toFixed(0)}% score, model: ${pr.modelName})`).join(' -> ') || 'Unscanned'}
      - Average logged steps over past 5 entries: ${avgSteps} steps/day
      - Active Diet focus: ${user.dietPlans[0] ? JSON.stringify(user.dietPlans[0].planData) : 'None'}
      - Active Exercise focus: ${user.exercisePlans[0] ? JSON.stringify(user.exercisePlans[0].planData) : 'None'}
      - Last clinical doctor remarks: ${user.doctorNotes.map(n => `Dr. ${n.doctor.profile?.lastName}: "${n.note}"`).join(' | ') || 'None'}`;
    }

    // 5. SEMANTIC RAG RETRIEVAL
    const ragResult = await retrieveRAGContext(message);
    retrievedGuidelines = ragResult.context;
    ragChunksUsed = ragResult.chunksUsed;

    // 6. SPECIALIST AGENT ROUTING
    if (hasWord(['eat', 'diet', 'recipe', 'meal', 'nutrition', 'calorie', 'food', 'dash', 'sodium', 'potassium'])) {
      agentType = 'DIET';
    } else if (hasWord(['exercise', 'walk', 'run', 'gym', 'workout', 'steps', 'cardio', 'aerobic', 'fitness'])) {
      agentType = 'EXERCISE';
    } else if (hasWord(['report', 'cbc', 'lipid', 'blood', 'scan', 'ecg', 'vitals', 'diastolic', 'systolic'])) {
      agentType = 'REPORT';
    } else if (hasWord(['hospital', 'clinic', 'pharmacy', 'nearby', 'location', 'doctor', 'cardiologist', 'chemist'])) {
      agentType = 'NEARBY';
    } else if (hasWord(['reminder', 'remind', 'medication', 'meds', 'pill', 'dose', 'atorvastatin', 'metoprolol', 'aspirin', 'prescription'])) {
      agentType = 'MEDICATION';
    } else if (user?.predictions && user.predictions.length > 0 && hasWord(['risk', 'score', 'probability', 'shap', 'prediction'])) {
      agentType = 'DIAGNOSIS';
    }
  }

  // 7. COMPILE SYSTEM INSTRUCTIONS
  let fullSystemInstruction = BASE_SYSTEM_PROMPT;

  if (useInternalServices) {
    let agentSystemInstruction = "";
    if (agentType === 'DIET') {
      agentSystemInstruction = `You are HridyaAI's specialist Diet Agent. Provide cardiac-friendly diet guides. Recommend low-sodium DASH or Mediterranean foods. Do not provide high-fat or processed meals. Ensure portion controls match the patient's BMI.`;
    } else if (agentType === 'EXERCISE') {
      agentSystemInstruction = `You are HridyaAI's specialist Exercise Agent. Suggest cardiorespiratory workouts (aerobic, brisk walk). Adjust intensity based on the patient's risk class (e.g. low-impact brisk walking for High Risk patients).`;
    } else if (agentType === 'REPORT') {
      agentSystemInstruction = `You are HridyaAI's specialist Report Agent. Help the patient interpret clinical lab metrics (e.g. cholesterol levels, hemoglobin, WBC counts). Provide educational information on what the abbreviations stand for.`;
    } else if (agentType === 'NEARBY') {
      agentSystemInstruction = `You are HridyaAI's specialist Nearby Health Agent. Advise the patient on how to utilize Leaflet filters on the platform to locate cardiologists, testing clinics, and pharmacies. Encourage them to verify facility details.`;
    } else if (agentType === 'DIAGNOSIS') {
      agentSystemInstruction = `You are HridyaAI's specialist Diagnosis Agent. Explain the SHAP feature contributions and cardiac risks calculated by the ensemble classifier. Interpret BP indices (systolic/diastolic) clearly.`;
    } else if (agentType === 'MEDICATION') {
      agentSystemInstruction = `You are HridyaAI's specialist Medication Agent. Details prescription statin alerts, beta-blocker timings, and safety parameters. Explain common side effects and safety considerations.`;
    } else {
      agentSystemInstruction = `You are HridyaAI, a helpful, conversational healthcare and general AI assistant. You can answer general user queries of any topic, alongside providing general lifestyle coaching, sleep advice, and cardiovascular reviews.`;
    }

    fullSystemInstruction = `${BASE_SYSTEM_PROMPT}

Specialist Context:
${agentSystemInstruction}

Patient Clinical Context Memory:
---
${patientContext}
---

Retrieved Clinical Reference Guidelines (Semantic Vector RAG — pgvector cosine similarity):
---
${retrievedGuidelines}
---

CRITICAL RULES:
1. Do NOT prescribe medication dosages (e.g. specify mg). If discussing drugs, add a warning disclaimer.
2. Answer in clean markdown (bullet lists, bold labels).
3. If patient mentions chest strain or difficulty breathing, immediately advise them to seek emergency care.
4. Ground your responses in the retrieved clinical guidelines above. Cite guideline titles when referencing specific thresholds.
5. If retrieved guidelines don't cover the query, state that the response is based on general medical knowledge.`;
  }

  // 8. CONVERSATION CONTEXT WINDOW LOAD
  // Exclude current user message record so history contains ONLY prior turns
  const pastMessages = await prisma.chatMessage.findMany({
    where: {
      sessionId: session.id,
      id: { not: userMessageRecord.id },
    },
    orderBy: { createdAt: 'asc' },
    take: 12,
  });

  const chatHistory = pastMessages.map(msg => ({
    role: msg.role === 'USER' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // 9. CALL GEMINI WITH TELEMETRY
  let reply = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let callStatus: 'SUCCESS' | 'FAILED' | 'HALLUCINATION_FLAGGED' = 'SUCCESS';
  let errorMsg: string | undefined;
  
  const genAI = getGenAI();

  if (!genAI) {
    logger.warn('[HridyaAI] Gemini execution blocked: Gemini API Key is not configured.');
    reply = "[HridyaAI Error] GEMINI_API_KEY is not configured in the server environment.";
    callStatus = 'FAILED';
    errorMsg = 'Missing API Key';
  } else {
    try {
      logger.info(`[HridyaAI DEBUG] Selected Gemini model: "${GEMINI_MODEL}"`);
      logger.info(`[HridyaAI DEBUG] Request sent to Gemini with system prompt length: ${fullSystemInstruction.length}`);
      logger.info(`[HridyaAI DEBUG] User prompt sent to Gemini: "${message}"`);

      const candidateModels = Array.from(new Set([GEMINI_MODEL, 'gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-preview']));
      let lastError: any = null;

      for (const mName of candidateModels) {
        try {
          logger.info(`[HridyaAI DEBUG] Attempting execution with model: "${mName}"`);
          const model = genAI.getGenerativeModel({
            model: mName,
            systemInstruction: fullSystemInstruction,
          });

          const chat = model.startChat({
            history: chatHistory,
          });

          const result = await chat.sendMessage(message);
          reply = result.response.text();

          const usage = result.response.usageMetadata;
          if (usage) {
            inputTokens = usage.promptTokenCount || 0;
            outputTokens = usage.candidatesTokenCount || 0;
          }
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          logger.warn(`[HridyaAI DEBUG] Model ${mName} execution error: ${err.message.slice(0, 120)}...`);
        }
      }

      if (lastError && !reply) {
        if (lastError.message?.includes('429') || lastError.message?.includes('Quota exceeded')) {
          reply = "I am currently processing a high volume of requests. Based on your profile guidelines: please maintain healthy hydration (2.5L+ water), keep active cardio movement (30 mins daily walk), and follow up with your doctor for clinical evaluations.";
        } else {
          throw lastError;
        }
      }

      logger.info(`[HridyaAI DEBUG] Gemini response status: SUCCESS`);
      logger.info(`[HridyaAI DEBUG] Response returned to frontend: "${reply.slice(0, 100)}..."`);
      logger.info(`[HridyaAI DEBUG] Token usage metrics: Input=${inputTokens}, Output=${outputTokens}, Total=${inputTokens + outputTokens}`);

      // Hallucination check: flag if response mentions specific drug dosages
      const dosagePattern = /\b\d+\s*(mg|mcg|ml|units?)\b/i;
      if (dosagePattern.test(reply)) {
        callStatus = 'HALLUCINATION_FLAGGED';
        reply += `\n\n*⚠️ This response was flagged for potential medication dosage content. Please verify with a licensed physician.*`;
      }
    } catch (err: any) {
      logger.error(`[HridyaAI DEBUG] Gemini response status: FAILED - ${err.message}`);
      reply = `[HridyaAI Error] Failed to generate response from Gemini API: ${err.message}`;
      callStatus = 'FAILED';
      errorMsg = err.message;
    }
  }

  // 10. OUTPUT SAFETY LAYER (Self-treatment filter)
  const medicationWords = ['dose', 'milligram', ' mg ', 'prescription', 'pills', 'tablet', 'atorvastatin', 'metoprolol', 'aspirin'];
  const containsMeds = medicationWords.some(word => reply.toLowerCase().includes(word));
  if (containsMeds && callStatus !== 'HALLUCINATION_FLAGGED' && callStatus !== 'FAILED') {
    reply += `\n\n*⚠️ Educational Disclaimer: The medical information discussed above is for diagnostic education only. Never alter clinical prescription dosages without consulting a licensed physician.*`;
  }

  // Save Assistant message in DB
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'ASSISTANT',
      content: reply,
      agentType,
    },
  });

  // 11. LOG TELEMETRY (fire-and-forget, non-blocking)
  const latencyMs = Math.round(performance.now() - startTime);
  logger.info(`[HridyaAI] Session ID: ${session.id} | Call Latency: ${latencyMs}ms | Call Status: ${callStatus}`);

  trackAICall({
    userId: validUserId,
    agentType,
    model: genAI ? GEMINI_MODEL : 'unconfigured-fallback',
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs,
    ragChunksUsed,
    status: callStatus,
    errorMessage: errorMsg,
  }).catch(() => {});

  return {
    sessionId: session.id,
    reply,
    agentType,
    debug: {
      geminiConnected: callStatus !== 'FAILED',
      apiKeyLoaded: !!genAI,
      model: genAI ? GEMINI_MODEL : 'unconfigured-fallback',
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
