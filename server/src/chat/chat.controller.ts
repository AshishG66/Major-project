import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { askHridyaAI, GEMINI_MODEL } from '../services/aiOrchestrator.js';
import { eventBus, EVENTS } from '../utils/eventBus.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export const sendMessage = async (req: Request, res: Response) => {
  const startTime = performance.now();
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { message, sessionId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    // STEP 3 - VERIFY EXPRESS ROUTE LOGS
    console.log('\n========================================================');
    console.log('[STEP 3 - EXPRESS ROUTE REACHED]');
    console.log(`Incoming Request: POST /api/chat/message`);
    console.log(`User ID:          ${userId}`);
    console.log(`Session ID:       ${sessionId || 'NEW_SESSION'}`);
    console.log(`Message:          "${message}"`);
    console.log('========================================================\n');

    logger.info(`Routing message from user ${userId} to Multi-Agent AI Orchestrator`);
    const result = await askHridyaAI(userId, sessionId, message);

    const responseData = {
      success: true,
      sessionId: result.sessionId,
      reply: result.reply,
      agentType: result.agentType,
      debug: result.debug,
    };

    // STEP 7 - VERIFY API RESPONSE LOGS
    console.log('\n========================================================');
    console.log('[STEP 7 - EXACT JSON RETURNED BY EXPRESS]');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('========================================================\n');

    res.status(200).json(responseData);
  } catch (error: any) {
    logger.error(`Error in sendMessage orchestrator: ${error.message}`);
    const latencyMs = Math.round(performance.now() - startTime);
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    res.status(500).json({
      success: false,
      message: error.message,
      debug: {
        geminiConnected: false,
        apiKeyLoaded: !!key,
        model: GEMINI_MODEL,
        promptSent: 'Orchestrator failed during execution',
        responseReceived: error.message,
        latencyMs,
        tokenUsage: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
        }
      }
    });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id || 'demo-patient-amit';

    let validUserId = userId;
    try {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        const defaultUser = await prisma.user.findFirst();
        if (defaultUser) {
          validUserId = defaultUser.id;
        }
      }

      const sessions = await prisma.chatSession.findMany({
        where: { userId: validUserId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return res.status(200).json({ success: true, sessions });
    } catch (err: any) {
      logger.warn(`[Sessions DB Warning] ${err.message}. Returning fallback session.`);
      return res.status(200).json({
        success: true,
        sessions: [
          {
            id: 'session-demo-active',
            userId: validUserId,
            title: 'HridyaAI Consultation',
            createdAt: new Date().toISOString(),
          }
        ]
      });
    }
  } catch (error: any) {
    res.status(200).json({
      success: true,
      sessions: [
        {
          id: 'session-demo-active',
          userId: 'demo-patient-amit',
          title: 'HridyaAI Consultation',
          createdAt: new Date().toISOString(),
        }
      ]
    });
  }
};

export const getSessionMessages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    try {
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: id as string },
        orderBy: { createdAt: 'asc' },
      });

      return res.status(200).json({ success: true, messages });
    } catch (err: any) {
      logger.warn(`[Session Messages DB Warning] ${err.message}. Returning empty message array.`);
      return res.status(200).json({ success: true, messages: [] });
    }
  } catch (error: any) {
    res.status(200).json({ success: true, messages: [] });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id || 'demo-patient-amit';
    const newSessionId = `session-${Date.now()}`;

    try {
      const session = await prisma.chatSession.create({
        data: {
          userId,
          title: 'New Health Consultation',
        },
      });

      return res.status(201).json({ success: true, session });
    } catch (err: any) {
      logger.warn(`[Create Session DB Warning] ${err.message}. Returning memory session.`);
      return res.status(201).json({
        success: true,
        session: {
          id: newSessionId,
          userId,
          title: 'New Health Consultation',
          createdAt: new Date().toISOString(),
        }
      });
    }
  } catch (error: any) {
    res.status(201).json({
      success: true,
      session: {
        id: `session-${Date.now()}`,
        userId: 'demo-patient-amit',
        title: 'New Health Consultation',
        createdAt: new Date().toISOString(),
      }
    });
  }
};

// MULTIMODAL OCR REPORT PARSER
export const uploadReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { fileData, fileName, fileType } = req.body;
    if (!fileData || !fileName || !fileType) {
      return res.status(400).json({ success: false, message: 'fileData (base64), fileName, and fileType are required.' });
    }

    logger.info(`Received medical report upload: ${fileName} from user ${userId}`);

    let parsedValues = null;
    let summaryText = "";

    if (!genAI) {
      // Fallback demo parsing if Gemini is not set
      parsedValues = {
        hemoglobin: "14.2 g/dL",
        white_blood_cell: "7,500 /mcL",
        total_cholesterol: "245 mg/dL",
        ldl: "155 mg/dL",
        hdl: "45 mg/dL",
        glucose: "98 mg/dL",
        ecg_rhythm: "Sinus Rhythm with minor sinus arrhythmia",
      };
      
      summaryText = `**[DEMO SCALAR READ]** This is a simulated scan of "${fileName}".
      * Cholesterol levels indicate borderline high LDL.
      * Fasting glucose levels are in normal range.
      * Normal resting sinus rhythm.`;
    } else {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        
        // Extract mime type from base64 header or filename
        const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
        
        // Check document type to optimize OCR extraction template
        const lowerName = fileName.toLowerCase();
        let docPrompt = "";
        if (lowerName.includes('cbc') || lowerName.includes('blood')) {
          docPrompt = "This is a Complete Blood Count (CBC) report. Extract hemoglobin, white_blood_cell, red_blood_cell, platelets, hematocrit.";
        } else if (lowerName.includes('lipid') || lowerName.includes('cholesterol')) {
          docPrompt = "This is a Lipid Profile report. Extract total_cholesterol, ldl, hdl, triglycerides, vldl.";
        } else if (lowerName.includes('ecg') || lowerName.includes('electrocardiogram')) {
          docPrompt = "This is an ECG report. Extract heart_rate, rhythm, pr_interval, qrs_duration, qt_interval, axes, and check for ST-T wave abnormalities.";
        } else if (lowerName.includes('echo') || lowerName.includes('echocardiogram')) {
          docPrompt = "This is an Echocardiography summary. Extract ejection_fraction (EF), left_ventricular_dimensions, and valve_status. Check if EF is normal (>50%).";
        } else {
          docPrompt = "Extract all cardiovascular risk metrics, lipids, sugar levels, or ecg diagnostics.";
        }

        const prompt = `You are an expert clinical laboratory OCR report parser.
        Inspect the attached medical report file. ${docPrompt}
        Return a strict JSON format with exactly two main keys:
        1. "values": A dictionary of extracted keys and values.
        2. "summary": A markdown-styled paragraph explaining what these values mean for the patient's cardiovascular fitness.
        Do NOT wrap the response in any markdown code block templates (like \`\`\`json). Return raw JSON string only.`;

        const result = await model.generateContent([
          {
            inlineData: {
              data: fileData,
              mimeType
            }
          },
          prompt
        ]);

        const rawText = result.response.text().trim();
        // Handle standard markdown code blocks wrappers if Gemini returns them anyway
        const jsonText = rawText.startsWith('```') 
          ? rawText.replace(/^```json/, '').replace(/```$/, '').trim()
          : rawText;
          
        const parsedJson = JSON.parse(jsonText);
        parsedValues = parsedJson.values || {};
        summaryText = parsedJson.summary || "Medical report successfully parsed.";
      } catch (err: any) {
        logger.error(`Gemini Multimodal OCR parsing failed: ${err.message}`);
        return res.status(502).json({
          success: false,
          message: `Failed to complete report OCR analysis due to cognitive model issues: ${err.message}`,
        });
      }
    }

    // Save report in Database
    const report = await prisma.report.create({
      data: {
        userId,
        title: fileName,
        fileUrl: '', // Mock file path
        fileType,
        parsedValues: parsedValues as any,
        summary: summaryText,
      },
    });

    // Create system notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Lab Report Scanned',
        message: `Successfully analyzed report "${fileName}". View parsed parameters in the console.`,
      },
    });

    // Emit event asynchronously through the EventBus
    eventBus.emit(EVENTS.REPORT_SCANNED, {
      userId,
      report,
    });

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error(`Error in uploadReport: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
