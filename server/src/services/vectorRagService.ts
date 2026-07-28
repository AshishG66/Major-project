import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSION = 768;

// ─── Clinical Guideline Chunks for Seeding ───
const CLINICAL_KNOWLEDGE_CHUNKS = [
  // Blood Pressure
  { category: 'BP', title: 'AHA Blood Pressure Classification', content: 'According to the American Heart Association (AHA) and American College of Cardiology (ACC) 2017 guidelines, blood pressure is classified as: Normal (<120/<80 mmHg), Elevated (120-129/<80 mmHg), Stage 1 Hypertension (130-139 or 80-89 mmHg), Stage 2 Hypertension (≥140 or ≥90 mmHg), and Hypertensive Crisis (>180 and/or >120 mmHg) requiring immediate medical attention.' },
  { category: 'BP', title: 'Hypertension Treatment Thresholds', content: 'For patients with Stage 1 Hypertension and no additional cardiovascular risk factors, lifestyle modification is the first-line treatment for 3-6 months before considering pharmacotherapy. For Stage 2 or patients with existing atherosclerotic cardiovascular disease (ASCVD) risk ≥10%, pharmacological intervention with ACE inhibitors, ARBs, calcium channel blockers, or thiazide diuretics is recommended.' },
  { category: 'BP', title: 'White Coat Hypertension', content: 'White coat hypertension occurs in 15-30% of patients with elevated office blood pressure readings. Ambulatory blood pressure monitoring (ABPM) or home blood pressure monitoring (HBPM) over 7 days is recommended to confirm persistent hypertension before initiating treatment.' },
  { category: 'BP', title: 'Resistant Hypertension', content: 'Resistant hypertension is defined as blood pressure remaining above goal despite concurrent use of 3 antihypertensive agents of different classes at optimal doses, one ideally being a diuretic. Secondary causes include renal artery stenosis, primary aldosteronism, pheochromocytoma, and obstructive sleep apnea.' },
  { category: 'BP', title: 'Blood Pressure Monitoring Best Practices', content: 'For accurate home blood pressure monitoring: use a validated upper-arm cuff, sit quietly for 5 minutes before measurement, feet flat on floor, arm supported at heart level. Take 2 readings 1 minute apart and average them. Measure in the morning before medications and in the evening before dinner. Log at least 12-14 readings over 7 days.' },

  // Lipid Profile
  { category: 'LIPID', title: 'Optimal Lipid Panel Values', content: 'The National Lipid Association recommends: Total Cholesterol <200 mg/dL (desirable), 200-239 mg/dL (borderline high), ≥240 mg/dL (high risk). LDL Cholesterol: Optimal <100 mg/dL, Near Optimal 100-129, Borderline High 130-159, High 160-189, Very High ≥190. HDL: ≥60 mg/dL is cardioprotective; <40 mg/dL (men) or <50 mg/dL (women) is a major risk factor. Triglycerides: Normal <150, Borderline 150-199, High 200-499, Very High ≥500 mg/dL.' },
  { category: 'LIPID', title: 'Statin Therapy Guidelines', content: 'High-intensity statin therapy (atorvastatin 40-80mg or rosuvastatin 20-40mg) is recommended for: clinical ASCVD, LDL ≥190 mg/dL, diabetes mellitus aged 40-75 with LDL ≥70, or 10-year ASCVD risk ≥7.5%. Moderate-intensity statins for those with lower risk profiles. Monitor liver enzymes and creatine kinase if symptoms of myopathy develop.' },
  { category: 'LIPID', title: 'Non-HDL Cholesterol Significance', content: 'Non-HDL cholesterol (Total Cholesterol minus HDL) captures all atherogenic lipoprotein particles including LDL, VLDL, IDL, and Lp(a). A non-HDL target of <130 mg/dL corresponds to LDL <100 mg/dL. Non-HDL is a better predictor of cardiovascular events than LDL alone, especially in patients with elevated triglycerides or metabolic syndrome.' },
  { category: 'LIPID', title: 'Triglyceride Management', content: 'Severely elevated triglycerides (≥500 mg/dL) increase pancreatitis risk and require immediate dietary fat restriction to <15% of calories and possible fibrate therapy. For moderate elevation (150-499), emphasize weight loss, reduced refined carbohydrates and alcohol, increased omega-3 fatty acids (EPA/DHA 2-4g daily), and regular aerobic exercise.' },

  // Glucose & Diabetes
  { category: 'GLUCOSE', title: 'Fasting Blood Glucose Standards', content: 'According to the American Diabetes Association (ADA): Normal fasting blood glucose is <100 mg/dL. Prediabetes (impaired fasting glucose) is 100-125 mg/dL. Diabetes mellitus is diagnosed at ≥126 mg/dL confirmed on two separate occasions. Random plasma glucose ≥200 mg/dL with classic hyperglycemic symptoms also confirms diabetes.' },
  { category: 'GLUCOSE', title: 'HbA1c Diagnostic Criteria', content: 'Glycated hemoglobin (HbA1c) reflects average blood glucose over 2-3 months. Normal: <5.7%. Prediabetes: 5.7-6.4%. Diabetes: ≥6.5%. For diagnosed diabetic patients, ADA recommends an HbA1c target of <7.0% for most adults, with individualization based on age, comorbidities, and hypoglycemia risk.' },
  { category: 'GLUCOSE', title: 'Diabetic Cardiovascular Risk', content: 'Type 2 diabetes increases cardiovascular disease risk by 2-4x. The UKPDS risk engine estimates 10-year coronary heart disease risk. Key management includes: aggressive BP control (<130/80), statin therapy for all diabetic patients aged 40+, SGLT2 inhibitors or GLP-1 receptor agonists for those with established ASCVD, and aspirin for secondary prevention.' },
  { category: 'GLUCOSE', title: 'Metabolic Syndrome Criteria', content: 'Metabolic syndrome is diagnosed when 3 or more of the following 5 criteria are met: waist circumference >102 cm (men) or >88 cm (women), triglycerides ≥150 mg/dL, HDL <40 mg/dL (men) or <50 mg/dL (women), blood pressure ≥130/85 mmHg, fasting glucose ≥100 mg/dL. Presence significantly increases cardiovascular and diabetes risk.' },

  // Diet
  { category: 'DIET', title: 'DASH Diet Protocol', content: 'The DASH (Dietary Approaches to Stop Hypertension) diet has been clinically proven to lower systolic BP by 8-14 mmHg. Key components: 4-5 servings of fruits and vegetables daily, whole grains, lean proteins (fish, poultry), low-fat dairy, nuts and legumes 4-5 times per week. Restrict sodium to <2,300 mg/day (ideally <1,500 mg/day), limit saturated fat to <6% of calories, and minimize sweets and sugar-sweetened beverages.' },
  { category: 'DIET', title: 'Mediterranean Diet Benefits', content: 'The Mediterranean diet reduces cardiovascular mortality by 25-30% according to the PREDIMED trial. Core components: extra virgin olive oil as primary fat source, fish and seafood 2+ times/week, abundance of fresh vegetables and fruits, whole grains, legumes, nuts (especially walnuts and almonds), moderate red wine with meals (optional), and minimal red meat, processed foods, and refined sugars.' },
  { category: 'DIET', title: 'Omega-3 Fatty Acids', content: 'EPA and DHA omega-3 fatty acids reduce triglycerides by 15-30%, lower blood pressure, and reduce inflammation. The AHA recommends: oily fish (salmon, mackerel, sardines) 2 servings/week. For patients with documented coronary heart disease: 1g EPA+DHA daily. For hypertriglyceridemia: 2-4g daily under medical supervision. Plant sources (flaxseed, chia, walnuts) provide ALA which converts to EPA/DHA at only 5-15%.' },
  { category: 'DIET', title: 'Potassium and Heart Health', content: 'Adequate potassium intake (3,500-5,000 mg/day) helps lower blood pressure by counteracting sodium effects and relaxing blood vessel walls. Rich sources: bananas (422mg per medium), sweet potatoes (541mg), spinach (839mg per cup cooked), avocados (975mg), white beans (1,189mg per cup). Caution in patients with chronic kidney disease or taking potassium-sparing diuretics.' },
  { category: 'DIET', title: 'Sodium Restriction Guidelines', content: 'Excessive sodium intake (>5g/day) is a leading modifiable risk factor for hypertension and cardiovascular disease. The WHO recommends <2g sodium/day (<5g salt). High sodium sources: processed meats, canned soups, frozen meals, bread, cheese, soy sauce. Reading nutrition labels and cooking at home significantly reduces sodium intake. A 1g/day reduction in sodium can decrease systolic BP by 3-5 mmHg.' },

  // Exercise
  { category: 'EXERCISE', title: 'AHA Physical Activity Guidelines', content: 'The American Heart Association recommends: at least 150 minutes of moderate-intensity aerobic activity (brisk walking at 3-4 mph, cycling <10 mph) or 75 minutes of vigorous activity (running, swimming laps) per week, preferably spread across most days. Additionally, moderate-to-high intensity muscle-strengthening activity at least 2 days per week. Reduce sedentary time and break up prolonged sitting every 30 minutes.' },
  { category: 'EXERCISE', title: 'Exercise for Cardiac Rehabilitation', content: 'Phase II cardiac rehabilitation exercise prescription: start at 40-60% of heart rate reserve (HRR), progress to 60-80% over 8-12 weeks. Sessions: 30-60 minutes including warm-up and cool-down. Modes: walking, stationary cycling, arm ergometry. Continuous ECG monitoring during initial sessions. Rating of Perceived Exertion (RPE) should be 11-14 on the Borg scale (fairly light to somewhat hard).' },
  { category: 'EXERCISE', title: 'Exercise-Induced Cardiac Risk', content: 'While regular exercise is cardioprotective, acute vigorous exercise transiently increases cardiac event risk in sedentary individuals. Warning signs requiring exercise cessation: chest pain, dizziness, syncope, severe dyspnea, palpitations with lightheadedness. Pre-exercise cardiac screening (ECG, stress test) is recommended for: men >45 and women >55 starting vigorous programs, or anyone with 2+ cardiovascular risk factors.' },
  { category: 'EXERCISE', title: 'Heart Rate Training Zones', content: 'Maximum Heart Rate (MHR) estimation: 220 minus age. Zone 1 (50-60% MHR): warmup/recovery. Zone 2 (60-70% MHR): fat burning, base fitness. Zone 3 (70-80% MHR): aerobic endurance, improves cardiovascular efficiency. Zone 4 (80-90% MHR): anaerobic threshold training. Zone 5 (90-100% MHR): maximum effort, used sparingly. For cardiac patients, stay within prescribed zones and use RPE as a secondary guide.' },

  // ECG
  { category: 'ECG', title: 'Normal ECG Parameters', content: 'Normal resting 12-lead ECG parameters: Heart rate 60-100 bpm (sinus rhythm), PR interval 120-200ms, QRS duration 80-120ms, QT interval corrected (QTc) <440ms (men) or <460ms (women), normal axis 0 to +90 degrees. P wave: upright in leads I, II, aVF; duration <120ms, amplitude <2.5mm. T waves: concordant with QRS in most leads.' },
  { category: 'ECG', title: 'ST-T Wave Abnormalities', content: 'ST-segment depression ≥0.5mm in 2+ contiguous leads suggests myocardial ischemia or subendocardial injury. ST elevation ≥1mm in limb leads or ≥2mm in precordial leads indicates acute myocardial infarction (STEMI) requiring emergent reperfusion therapy. T wave inversions (>1mm) in leads with normally upright T waves may indicate ischemia, cardiomyopathy, or pulmonary embolism. Hyperacute peaked T waves are the earliest sign of acute MI.' },
  { category: 'ECG', title: 'Left Ventricular Hypertrophy on ECG', content: 'ECG criteria for Left Ventricular Hypertrophy (LVH): Sokolow-Lyon criterion: S in V1 + R in V5 or V6 ≥35mm. Cornell voltage criterion: R in aVL + S in V3 >28mm (men) or >20mm (women). LVH with strain pattern: ST depression and asymmetric T wave inversion in lateral leads (I, aVL, V5-V6). LVH is associated with chronic hypertension and increases risk of heart failure, atrial fibrillation, and sudden cardiac death.' },
  { category: 'ECG', title: 'Arrhythmia Classification', content: 'Common cardiac arrhythmias: Atrial Fibrillation (irregularly irregular, absent P waves, CHA2DS2-VASc score guides anticoagulation), Atrial Flutter (sawtooth pattern, 300 bpm atrial rate with regular ventricular response), Supraventricular Tachycardia (narrow QRS, rate 150-250 bpm, responds to vagal maneuvers or adenosine). Ventricular Tachycardia (wide QRS ≥120ms, rate >100 bpm, potentially life-threatening) requires urgent evaluation.' },

  // Echocardiography
  { category: 'ECHO', title: 'Ejection Fraction Classification', content: 'Left Ventricular Ejection Fraction (LVEF) is the gold standard for systolic function assessment. Normal LVEF: 55-70%. Mildly reduced: 41-54%. Moderately reduced: 30-40%. Severely reduced: <30%. Heart failure with preserved ejection fraction (HFpEF): LVEF ≥50% with diastolic dysfunction. Heart failure with reduced ejection fraction (HFrEF): LVEF ≤40%, treated with ACE inhibitors/ARBs, beta-blockers, MRAs, and SGLT2 inhibitors.' },
  { category: 'ECHO', title: 'Valvular Heart Disease Assessment', content: 'Echocardiographic assessment of cardiac valves: Aortic Stenosis severity by valve area: mild (>1.5 cm²), moderate (1.0-1.5 cm²), severe (<1.0 cm²) with mean gradient >40 mmHg. Mitral Regurgitation graded by jet area, vena contracta width, and regurgitant volume. Indications for surgical intervention include severe symptomatic stenosis, EF <50% with severe regurgitation, or progressive LV dilation.' },

  // Medications & Interactions
  { category: 'MEDICATION', title: 'Cardiovascular Drug Classes', content: 'Major cardiovascular medication classes: ACE Inhibitors (enalapril, ramipril) reduce afterload and cardiac remodeling. Beta-blockers (metoprolol, bisoprolol) reduce heart rate and myocardial oxygen demand. Calcium Channel Blockers (amlodipine, diltiazem) vasodilate and reduce BP. Diuretics (hydrochlorothiazide, furosemide) reduce fluid overload. Antiplatelet agents (aspirin, clopidogrel) prevent thrombotic events. Statins (atorvastatin) lower LDL and stabilize plaques.' },
  { category: 'MEDICATION', title: 'Drug Interaction Warnings', content: 'Critical cardiovascular drug interactions: ACE inhibitors + potassium-sparing diuretics = hyperkalemia risk. Beta-blockers + non-dihydropyridine CCBs (diltiazem/verapamil) = severe bradycardia/heart block. Statins + CYP3A4 inhibitors (clarithromycin, grapefruit) = rhabdomyolysis risk. Warfarin + NSAIDs = increased bleeding. Digoxin + amiodarone = digoxin toxicity. Always review complete medication lists before prescribing.' },

  // Risk Assessment
  { category: 'GENERAL', title: 'Framingham Risk Score', content: 'The Framingham Risk Score estimates 10-year cardiovascular disease risk using: age, sex, total cholesterol, HDL cholesterol, systolic blood pressure, blood pressure treatment status, smoking status, and diabetes status. Low risk: <10%, Moderate risk: 10-20%, High risk: >20%. Used to guide intensity of preventive interventions including statin therapy initiation, aspirin use, and blood pressure treatment targets.' },
  { category: 'GENERAL', title: 'ASCVD Risk Calculator', content: 'The Pooled Cohort Equations (PCE) estimate 10-year atherosclerotic cardiovascular disease risk for adults 40-79 years. Inputs: age, sex, race, total cholesterol, HDL cholesterol, systolic BP, BP treatment status, diabetes, and smoking. Risk categories: Low (<5%), Borderline (5-7.4%), Intermediate (7.5-19.9%), High (≥20%). Risk-enhancing factors include family history, metabolic syndrome, CKD, inflammatory conditions, and elevated Lp(a) or hsCRP.' },
  { category: 'GENERAL', title: 'Modifiable vs Non-Modifiable Risk Factors', content: 'Non-modifiable cardiovascular risk factors: age (men ≥45, women ≥55), sex (males at higher risk), family history of premature CHD (first-degree male relative <55 or female <65), race/ethnicity. Modifiable risk factors: hypertension, dyslipidemia, diabetes, smoking, obesity, physical inactivity, unhealthy diet, excessive alcohol, chronic stress. Addressing modifiable risk factors can reduce cardiovascular event risk by 50-80%.' },

  // Sleep & Stress
  { category: 'GENERAL', title: 'Sleep and Cardiovascular Health', content: 'The AHA added sleep duration as the 8th essential component of cardiovascular health (Life\'s Essential 8). Optimal sleep: 7-9 hours for adults. Short sleep (<6 hours) increases hypertension risk by 20%, coronary heart disease by 48%, and stroke by 15%. Obstructive sleep apnea (OSA) affects 30-50% of heart failure patients and independently increases AF risk. CPAP therapy in OSA reduces nocturnal BP and improves cardiac function.' },
  { category: 'GENERAL', title: 'Chronic Stress and Heart Disease', content: 'Chronic psychological stress activates the hypothalamic-pituitary-adrenal axis, elevating cortisol, increasing sympathetic nervous system activity, promoting inflammation (elevated IL-6, CRP), and accelerating atherosclerosis. Stress management techniques with cardiovascular evidence: mindfulness-based stress reduction (MBSR) lowers BP by 4-5 mmHg, transcendental meditation reduces cardiovascular mortality by 48% (MAHARISHI study), regular yoga practice reduces heart rate variability markers of autonomic dysfunction.' },

  // Smoking
  { category: 'GENERAL', title: 'Smoking Cessation Benefits Timeline', content: 'Cardiovascular benefits of smoking cessation: 20 minutes - heart rate and BP begin to drop. 12 hours - blood CO levels normalize. 2-12 weeks - circulation improves, lung function increases. 1 year - coronary heart disease risk drops to half that of a smoker. 5 years - stroke risk reduces to that of a non-smoker. 15 years - coronary heart disease risk equals a never-smoker. Pharmacotherapy: varenicline (most effective), bupropion, or nicotine replacement therapy.' },

  // BMI & Obesity
  { category: 'GENERAL', title: 'BMI Classification and Cardiac Impact', content: 'WHO BMI classification: Underweight (<18.5), Normal (18.5-24.9), Overweight (25-29.9), Obesity Class I (30-34.9), Class II (35-39.9), Class III (≥40). Each 5 kg/m² increase in BMI above 25 is associated with 30% higher cardiovascular mortality. Central obesity (waist circumference >102 cm men, >88 cm women) is a stronger predictor than BMI alone. Weight loss of 5-10% body weight significantly improves BP, lipids, and insulin sensitivity.' },

  // Kidney & Liver interactions
  { category: 'RENAL', title: 'Chronic Kidney Disease and Cardiovascular Risk', content: 'CKD is an independent cardiovascular risk factor. eGFR <60 mL/min/1.73m² doubles CV risk. Key markers: Creatinine (normal: 0.6-1.2 mg/dL men, 0.5-1.1 women), BUN (7-20 mg/dL), eGFR (>90 normal, 60-89 mild decrease, 30-59 moderate, 15-29 severe, <15 kidney failure). Albuminuria (>30 mg/g) indicates kidney damage. CKD patients require dose-adjusted medications and careful potassium monitoring.' },
  { category: 'HEPATIC', title: 'Liver Function and Cardiovascular Medications', content: 'Liver function tests relevant to cardiovascular care: ALT (7-56 U/L), AST (10-40 U/L), Total Bilirubin (0.1-1.2 mg/dL), Alkaline Phosphatase (44-147 U/L). Statins can elevate transaminases; discontinue if >3x upper limit of normal. Non-alcoholic fatty liver disease (NAFLD) is associated with 64% increased cardiovascular mortality. Hepatic congestion from right heart failure causes elevated bilirubin and transaminases (congestive hepatopathy).' },

  // Emergency
  { category: 'EMERGENCY', title: 'Acute Coronary Syndrome Recognition', content: 'Acute Coronary Syndrome (ACS) includes STEMI, NSTEMI, and unstable angina. Classic presentation: central crushing chest pain radiating to left arm/jaw, diaphoresis, nausea, dyspnea. Atypical presentations common in women, elderly, and diabetics: epigastric pain, isolated dyspnea, fatigue, syncope. Immediate actions: call emergency services, chew aspirin 325mg (if not allergic), sublingual nitroglycerin if prescribed. Door-to-balloon time goal for STEMI: <90 minutes.' },
  { category: 'EMERGENCY', title: 'Cardiac Arrest Chain of Survival', content: 'AHA Chain of Survival for out-of-hospital cardiac arrest: 1) Early recognition and activation of emergency response (call 911). 2) Early CPR with emphasis on chest compressions (100-120/min, 2 inches depth, allow full recoil). 3) Early defibrillation with AED (shock within 3-5 minutes increases survival to 50-70%). 4) Advanced resuscitative care by EMS. 5) Post-cardiac arrest care including targeted temperature management. Bystander CPR doubles survival rates.' },
];

/**
 * Embed a text string using Gemini text-embedding-004 model.
 * Returns a 768-dimensional float array.
 */
async function embedText(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    const hash = simpleHash(text);
    return Array.from({ length: EMBEDDING_DIMENSION }, (_, i) => 
      Math.sin(hash * (i + 1) * 0.001) * 0.5
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as any;
      if (data?.embedding?.values) {
        return data.embedding.values;
      }
    }
  } catch (err: any) {
    logger.warn(`[VectorRAG] Embedding fetch issue: ${err.message}. Using fallback vector.`);
  }

  const hash = simpleHash(text);
  return Array.from({ length: EMBEDDING_DIMENSION }, (_, i) => 
    Math.sin(hash * (i + 1) * 0.001) * 0.5
  );
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Seed the medical_knowledge table with clinical guideline chunks + embeddings.
 * Skips if already populated.
 */
export async function seedKnowledgeBase(): Promise<void> {
  const count = await prisma.medicalKnowledge.count();
  if (count > 0) {
    logger.info(`[VectorRAG] Knowledge base already seeded with ${count} chunks. Skipping.`);
    return;
  }

  logger.info(`[VectorRAG] Seeding ${CLINICAL_KNOWLEDGE_CHUNKS.length} clinical guideline chunks...`);

  for (const chunk of CLINICAL_KNOWLEDGE_CHUNKS) {
    try {
      const embedding = await embedText(`${chunk.title}. ${chunk.content}`);
      const vectorStr = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO medical_knowledge (id, category, title, content, embedding, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())`,
        chunk.category,
        chunk.title,
        chunk.content,
        vectorStr
      );
    } catch (err: any) {
      logger.warn(`[VectorRAG] Failed to seed chunk "${chunk.title}": ${err.message}`);
    }
  }

  const finalCount = await prisma.medicalKnowledge.count();
  logger.info(`[VectorRAG] Seeding complete. ${finalCount} chunks stored with embeddings.`);
}

/**
 * Perform semantic similarity search against the medical knowledge base.
 * Embeds the query, runs pgvector cosine similarity, returns top-K chunks.
 */
export async function semanticSearch(query: string, topK: number = 5): Promise<{ title: string; content: string; similarity: number }[]> {
  try {
    const queryEmbedding = await embedText(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const results = await prisma.$queryRawUnsafe<{ title: string; content: string; similarity: number }[]>(
      `SELECT title, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM medical_knowledge
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vectorStr,
      topK
    );

    logger.info(`[VectorRAG] Semantic search for "${query.slice(0, 40)}..." returned ${results.length} results (top similarity: ${results[0]?.similarity?.toFixed(3) || 'N/A'})`);
    return results;
  } catch (err: any) {
    logger.error(`[VectorRAG] Semantic search failed: ${err.message}`);
    // Fallback: keyword search on title/content
    const fallback = await prisma.medicalKnowledge.findMany({
      where: {
        OR: [
          { title: { contains: query.split(' ')[0], mode: 'insensitive' } },
          { content: { contains: query.split(' ')[0], mode: 'insensitive' } },
        ]
      },
      take: topK,
      select: { title: true, content: true },
    });
    return fallback.map(r => ({ ...r, similarity: 0.5 }));
  }
}

/**
 * Format retrieved chunks into a context string for LLM injection.
 */
export async function retrieveRAGContext(query: string): Promise<{ context: string; chunksUsed: number }> {
  const results = await semanticSearch(query, 5);
  
  if (results.length === 0) {
    return {
      context: 'General Cardiac Prevention: Risk factors like age, BMI, family history, and smoking status are cumulative. Regular screening and maintaining active lifestyle habits are core to preventative care.',
      chunksUsed: 0,
    };
  }

  const context = results
    .map((r, i) => `[${i + 1}] ${r.title} (relevance: ${(r.similarity * 100).toFixed(1)}%)\n${r.content}`)
    .join('\n\n');

  return { context, chunksUsed: results.length };
}
