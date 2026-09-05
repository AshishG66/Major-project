// HridyaDarpan Demonstration Mode Mock Service
import { useAuthStore } from '../store/authStore';

export interface DemoPatient {
  id: string;
  name: string;
  email: string;
  role: string;
  relationship?: string;
  healthScore: number;
  riskLevel: 'HIGH' | 'MODERATE' | 'LOW';
  modelName: string;
  confidenceScore: number;
  factors: {
    age: number;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    height: number;
    weight: number;
    bmi: number;
    systolicBP: number;
    diastolicBP: number;
    cholesterol: number;
    heartRate: number;
    bloodSugar: number;
    ecgResult: 'NORMAL' | 'ST_T_ABNORMAL' | 'LV_HYPERTROPHY';
    exerciseFrequency: number;
    smoking: boolean;
    alcohol: boolean;
    diabetes: boolean;
    familyHistory: boolean;
    chestPainType: 'TYPICAL' | 'ATYPICAL' | 'NON_ANGINAL' | 'ASYMPTOMATIC';
    sleepDuration: number;
    stressLevel: number;
  };
  predictions: any[];
  logs: any[];
  reminders: any[];
  notes: any[];
  chatSessions: any[];
  chatMessages: Record<string, any[]>;
}

// Initial Presentation Patient Profiles
const INITIAL_PATIENTS: DemoPatient[] = [
  {
    id: 'demo-patient-amit',
    name: 'Amit Sharma',
    email: 'amit.sharma@demo.com',
    role: 'PATIENT',
    relationship: 'FATHER',
    healthScore: 38,
    riskLevel: 'HIGH',
    modelName: 'XGBoost Classifier (ROC-AUC: 0.942)',
    confidenceScore: 0.942,
    factors: {
      age: 64,
      gender: 'MALE',
      height: 168,
      weight: 84,
      bmi: 29.8,
      systolicBP: 165,
      diastolicBP: 98,
      cholesterol: 280,
      heartRate: 84,
      bloodSugar: 145,
      ecgResult: 'LV_HYPERTROPHY',
      exerciseFrequency: 1,
      smoking: true,
      alcohol: false,
      diabetes: true,
      familyHistory: true,
      chestPainType: 'TYPICAL',
      sleepDuration: 5.5,
      stressLevel: 8
    },
    predictions: [
      {
        id: 'pred-amit-1',
        createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        riskLevel: 'MODERATE',
        riskScore: 58.4,
        modelName: 'XGBoost',
        confidenceScore: 0.89,
        healthScore: 52,
        plainExplanation: "Patient shows moderate blood pressure readings and mild arterial stiffness signs.",
        factors: { systolicBP: 140, diastolicBP: 90, bmi: 29.2, cholesterol: 250, heartRate: 78, ecgResult: 'NORMAL' },
        shapExplanation: [
          { feature: 'Systolic BP', value: '140 mmHg', shap_value: 0.052, importance: 0.18, impact: 'INCREASES_RISK' },
          { feature: 'Cholesterol', value: '250 mg/dL', shap_value: 0.041, importance: 0.15, impact: 'INCREASES_RISK' },
          { feature: 'Age', value: '64 yrs', shap_value: 0.038, importance: 0.14, impact: 'INCREASES_RISK' },
          { feature: 'Exercise', value: '1 day/wk', shap_value: -0.015, importance: 0.08, impact: 'REDUCES_RISK' },
          { feature: 'Smoking', value: 'Yes', shap_value: 0.024, importance: 0.09, impact: 'INCREASES_RISK' }
        ]
      },
      {
        id: 'pred-amit-2',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        riskLevel: 'HIGH',
        riskScore: 78.2,
        modelName: 'XGBoost',
        confidenceScore: 0.92,
        healthScore: 42,
        plainExplanation: "Blood pressure is elevating. Stage 2 Hypertension is active. LV Hypertrophy has developed on ECG.",
        factors: { systolicBP: 155, diastolicBP: 95, bmi: 29.6, cholesterol: 270, heartRate: 80, ecgResult: 'LV_HYPERTROPHY' },
        shapExplanation: [
          { feature: 'Systolic BP', value: '155 mmHg', shap_value: 0.084, importance: 0.28, impact: 'INCREASES_RISK' },
          { feature: 'ECG: LVH', value: 'Abnormal', shap_value: 0.075, importance: 0.25, impact: 'INCREASES_RISK' },
          { feature: 'Cholesterol', value: '270 mg/dL', shap_value: 0.052, importance: 0.18, impact: 'INCREASES_RISK' },
          { feature: 'Age', value: '64 yrs', shap_value: 0.038, importance: 0.14, impact: 'INCREASES_RISK' },
          { feature: 'Exercise', value: '1 day/wk', shap_value: -0.015, importance: 0.08, impact: 'REDUCES_RISK' }
        ]
      },
      {
        id: 'pred-amit-3',
        createdAt: new Date().toISOString(),
        riskLevel: 'HIGH',
        riskScore: 88.5,
        modelName: 'XGBoost Classifier (ROC-AUC: 0.942)',
        confidenceScore: 0.942,
        healthScore: 38,
        plainExplanation: "High-priority warning: Blood pressure is severely elevated (165 mmHg). Typical angina chest pain and ECG hypertrophy confirm acute cardiac strain.",
        factors: { systolicBP: 165, diastolicBP: 98, bmi: 29.8, cholesterol: 280, heartRate: 84, ecgResult: 'LV_HYPERTROPHY', age: 64, stressLevel: 8 },
        shapExplanation: [
          { feature: 'Systolic BP', value: '165 mmHg', shap_value: 0.115, importance: 0.38, impact: 'INCREASES_RISK' },
          { feature: 'ECG: LVH', value: 'Hypertrophy', shap_value: 0.092, importance: 0.31, impact: 'INCREASES_RISK' },
          { feature: 'Cholesterol', value: '280 mg/dL', shap_value: 0.068, importance: 0.22, impact: 'INCREASES_RISK' },
          { feature: 'Age', value: '64 yrs', shap_value: 0.045, importance: 0.15, impact: 'INCREASES_RISK' },
          { feature: 'Stress Rating', value: '8/10', shap_value: 0.032, importance: 0.11, impact: 'INCREASES_RISK' }
        ]
      }
    ],
    logs: [
      { id: 'log-amit-1', date: new Date(Date.now() - 86400000 * 3).toISOString(), waterIntake: 1.2, sleepHours: 5.5, stepsCount: 2300, activeMins: 10, stressLevel: 8 },
      { id: 'log-amit-2', date: new Date(Date.now() - 86400000 * 2).toISOString(), waterIntake: 1.0, sleepHours: 6.0, stepsCount: 3100, activeMins: 15, stressLevel: 7 },
      { id: 'log-amit-3', date: new Date(Date.now() - 86400000 * 1).toISOString(), waterIntake: 1.5, sleepHours: 5.0, stepsCount: 2800, activeMins: 0, stressLevel: 9 },
      { id: 'log-amit-4', date: new Date().toISOString(), waterIntake: 1.1, sleepHours: 5.5, stepsCount: 1900, activeMins: 5, stressLevel: 8 }
    ],
    reminders: [
      { id: 'rem-amit-1', title: 'Atorvastatin (Cholesterol) Pill', time: '08:00', type: 'MEDICINE', completed: false },
      { id: 'rem-amit-2', title: 'Amlodipine (Blood Pressure) Pill', time: '20:00', type: 'MEDICINE', completed: false },
      { id: 'rem-amit-3', title: 'Cardio Hydration Goal', time: '14:00', type: 'WATER', completed: true }
    ],
    notes: [
      {
        id: 'note-amit-1',
        note: "Instructed patient to record morning blood pressure daily. Initiated low-sodium DASH eating style. Restrict intense exercise due to LV Hypertrophy, stick to mild 15-minute walks.",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        doctor: { profile: { lastName: 'Vance' } }
      }
    ],
    chatSessions: [
      { id: 'sess-amit-1', title: 'Angina chest pain consult' }
    ],
    chatMessages: {
      'sess-amit-1': [
        { id: 'msg-amit-1', role: 'USER', content: 'What does LV Hypertrophy on my ECG scan mean?', agentType: 'ORCHESTRATOR' },
        { id: 'msg-amit-2', role: 'ASSISTANT', content: 'Left Ventricular Hypertrophy (LVH) means the muscle wall of your hearts main pumping chamber has thickened, usually due to high blood pressure. **Diagnosis Agent** advises checking your blood pressure immediately, as a reading of 165/98 mmHg requires pharmacological moderation.', agentType: 'DIAGNOSIS' },
        { id: 'msg-amit-3', role: 'USER', content: 'Suggest a meal plan to reduce my blood pressure.', agentType: 'ORCHESTRATOR' },
        { id: 'msg-amit-4', role: 'ASSISTANT', content: 'For Stage 2 Hypertension, the **Diet Agent** recommends the **DASH Diet**:\n*   Limit daily sodium intake to under 1,500 mg.\n*   Eat Potassium-rich foods: Bananas, spinach, sweet potatoes to balance sodium.\n*   Incorporate whole grains, lean poultry, and fish (rich in omega-3).\n*   Avoid canned soups, salted snacks, and processed meats.', agentType: 'DIET' }
      ]
    }
  },
  {
    id: 'demo-patient-priya',
    name: 'Priya Patel',
    email: 'priya.patel@demo.com',
    role: 'PATIENT',
    relationship: 'SPOUSE',
    healthScore: 62,
    riskLevel: 'MODERATE',
    modelName: 'Random Forest Classifier (ROC-AUC: 0.885)',
    confidenceScore: 0.885,
    factors: {
      age: 42,
      gender: 'FEMALE',
      height: 160,
      weight: 68,
      bmi: 26.6,
      systolicBP: 132,
      diastolicBP: 84,
      cholesterol: 215,
      heartRate: 76,
      bloodSugar: 105,
      ecgResult: 'NORMAL',
      exerciseFrequency: 2,
      smoking: false,
      alcohol: false,
      diabetes: false,
      familyHistory: false,
      chestPainType: 'NON_ANGINAL',
      sleepDuration: 6.2,
      stressLevel: 9
    },
    predictions: [
      {
        id: 'pred-priya-1',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        riskLevel: 'LOW',
        riskScore: 28.5,
        modelName: 'Random Forest',
        confidenceScore: 0.86,
        healthScore: 78,
        plainExplanation: "Cardiovascular health is generally stable. Slightly elevated stress is logged.",
        factors: { systolicBP: 124, diastolicBP: 80, bmi: 26.4, cholesterol: 195, heartRate: 72, ecgResult: 'NORMAL' },
        shapExplanation: [
          { feature: 'Age', value: '42 yrs', shap_value: -0.012, importance: 0.08, impact: 'REDUCES_RISK' },
          { feature: 'Exercise', value: '2 days/wk', shap_value: -0.008, importance: 0.05, impact: 'REDUCES_RISK' },
          { feature: 'Stress Rating', value: '5/10', shap_value: 0.012, importance: 0.06, impact: 'INCREASES_RISK' }
        ]
      },
      {
        id: 'pred-priya-2',
        createdAt: new Date().toISOString(),
        riskLevel: 'MODERATE',
        riskScore: 54.2,
        modelName: 'Random Forest Classifier (ROC-AUC: 0.885)',
        confidenceScore: 0.885,
        healthScore: 62,
        plainExplanation: "Vitals show mild elevation in blood pressure (132 mmHg) and high stress rating (9/10) pushing risk into the moderate category.",
        factors: { systolicBP: 132, diastolicBP: 84, bmi: 26.6, cholesterol: 215, heartRate: 76, ecgResult: 'NORMAL', age: 42, stressLevel: 9 },
        shapExplanation: [
          { feature: 'Stress Rating', value: '9/10', shap_value: 0.058, importance: 0.22, impact: 'INCREASES_RISK' },
          { feature: 'Systolic BP', value: '132 mmHg', shap_value: 0.035, importance: 0.14, impact: 'INCREASES_RISK' },
          { feature: 'Cholesterol', value: '215 mg/dL', shap_value: 0.024, importance: 0.10, impact: 'INCREASES_RISK' },
          { feature: 'Age', value: '42 yrs', shap_value: -0.012, importance: 0.08, impact: 'REDUCES_RISK' },
          { feature: 'Family History', value: 'No', shap_value: -0.018, importance: 0.09, impact: 'REDUCES_RISK' }
        ]
      }
    ],
    logs: [
      { id: 'log-priya-1', date: new Date(Date.now() - 86400000 * 2).toISOString(), waterIntake: 2.1, sleepHours: 6.5, stepsCount: 5400, activeMins: 20, stressLevel: 8 },
      { id: 'log-priya-2', date: new Date().toISOString(), waterIntake: 1.8, sleepHours: 6.0, stepsCount: 4800, activeMins: 15, stressLevel: 9 }
    ],
    reminders: [
      { id: 'rem-priya-1', title: 'Daily stress relief exercise', time: '18:00', type: 'EXERCISE', completed: false }
    ],
    notes: [
      {
        id: 'note-priya-1',
        note: "Patient reports stress at work. Heart metrics are borderline. Recommending deep breathing mindfulness drills, minimum 30 minutes light jogging 3x weekly, and tracking sleep.",
        createdAt: new Date().toISOString(),
        doctor: { profile: { lastName: 'Vance' } }
      }
    ],
    chatSessions: [
      { id: 'sess-priya-1', title: 'Stress and fatigue advice' }
    ],
    chatMessages: {
      'sess-priya-1': [
        { id: 'msg-priya-1', role: 'USER', content: 'I feel exhausted due to constant stress. How does it affect my heart?', agentType: 'ORCHESTRATOR' },
        { id: 'msg-priya-2', role: 'ASSISTANT', content: 'Elevated stress levels trigger chronic cortisol and adrenaline release, raising your resting heart rate and arterial pressure. **Exercise Agent** suggests:\n*   Start 15-minute mindfulness breathing twice daily.\n*   Perform low-intensity steady-state cardiovascular work (e.g. brisk walks, yoga) to regulate the sympathetic nervous system.\n*   Keep workouts moderate to avoid additional physiological cortisol strain.', agentType: 'EXERCISE' }
      ]
    }
  },
  {
    id: 'demo-patient-rohan',
    name: 'Rohan Verma',
    email: 'rohan.verma@demo.com',
    role: 'PATIENT',
    relationship: 'SELF',
    healthScore: 92,
    riskLevel: 'LOW',
    modelName: 'Gradient Boosting (ROC-AUC: 0.912)',
    confidenceScore: 0.912,
    factors: {
      age: 28,
      gender: 'MALE',
      height: 180,
      weight: 74,
      bmi: 22.8,
      systolicBP: 118,
      diastolicBP: 76,
      cholesterol: 165,
      heartRate: 64,
      bloodSugar: 85,
      ecgResult: 'NORMAL',
      exerciseFrequency: 5,
      smoking: false,
      alcohol: false,
      diabetes: false,
      familyHistory: false,
      chestPainType: 'ASYMPTOMATIC',
      sleepDuration: 7.8,
      stressLevel: 3
    },
    predictions: [
      {
        id: 'pred-rohan-1',
        createdAt: new Date().toISOString(),
        riskLevel: 'LOW',
        riskScore: 8.5,
        modelName: 'Gradient Boosting Classifier (ROC-AUC: 0.912)',
        confidenceScore: 0.912,
        healthScore: 92,
        plainExplanation: "Excellent clinical cardiovascular health. Patient maintains normal blood pressure, a highly active aerobic lifestyle, and ideal metabolic stats.",
        factors: { systolicBP: 118, diastolicBP: 76, bmi: 22.8, cholesterol: 165, heartRate: 64, ecgResult: 'NORMAL', age: 28, stressLevel: 3 },
        shapExplanation: [
          { feature: 'Exercise Frequency', value: '5 days/wk', shap_value: -0.065, importance: 0.26, impact: 'REDUCES_RISK' },
          { feature: 'Systolic BP', value: '118 mmHg', shap_value: -0.048, importance: 0.19, impact: 'REDUCES_RISK' },
          { feature: 'Age', value: '28 yrs', shap_value: -0.042, importance: 0.17, impact: 'REDUCES_RISK' },
          { feature: 'Smoking', value: 'No', shap_value: -0.038, importance: 0.15, impact: 'REDUCES_RISK' },
          { feature: 'Stress Rating', value: '3/10', shap_value: -0.024, importance: 0.10, impact: 'REDUCES_RISK' }
        ]
      }
    ],
    logs: [
      { id: 'log-rohan-1', date: new Date(Date.now() - 86400000 * 2).toISOString(), waterIntake: 3.2, sleepHours: 8.0, stepsCount: 11200, activeMins: 45, stressLevel: 2 },
      { id: 'log-rohan-2', date: new Date().toISOString(), waterIntake: 3.0, sleepHours: 7.5, stepsCount: 12500, activeMins: 50, stressLevel: 3 }
    ],
    reminders: [
      { id: 'rem-rohan-1', title: 'Evening Hydration Target', time: '21:00', type: 'WATER', completed: false }
    ],
    notes: [
      {
        id: 'note-rohan-1',
        note: "Excellent cardiovascular health maintained. Advised continuation of current high aerobic fitness and balanced diet.",
        createdAt: new Date().toISOString(),
        doctor: { profile: { lastName: 'Vance' } }
      }
    ],
    chatSessions: [
      { id: 'sess-rohan-1', title: 'Athletic heart questions' }
    ],
    chatMessages: {
      'sess-rohan-1': [
        { id: 'msg-rohan-1', role: 'USER', content: 'What is a good resting heart rate for an athlete?', agentType: 'ORCHESTRATOR' },
        { id: 'msg-rohan-2', role: 'ASSISTANT', content: 'Athletes typically have a resting heart rate between 40-60 bpm due to high stroke volume efficiency. **Exercise Agent** notes your rate of 64 bpm is highly efficient. Continue progressive overload cardio training to maintain peak cardiac compliance.', agentType: 'EXERCISE' }
      ]
    }
  }
];

// Helper to load/save state
const getDemoPatients = (): DemoPatient[] => {
  const saved = localStorage.getItem('demo_patients_data');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error(e); }
  }
  localStorage.setItem('demo_patients_data', JSON.stringify(INITIAL_PATIENTS));
  return INITIAL_PATIENTS;
};

const saveDemoPatients = (data: DemoPatient[]) => {
  localStorage.setItem('demo_patients_data', JSON.stringify(data));
};

export const getActiveDemoPatientId = (): string => {
  const active = localStorage.getItem('demo_active_patient_id');
  if (active) return active;
  const initial = INITIAL_PATIENTS[0].id;
  localStorage.setItem('demo_active_patient_id', initial);
  return initial;
};

export const setActiveDemoPatientId = (id: string) => {
  localStorage.setItem('demo_active_patient_id', id);
};

// Request Interceptor: handles mock routing
export async function handleDemoRequest(endpoint: string, options: any = {}): Promise<any> {
  const method = options.method || 'GET';
  const activePatientId = getActiveDemoPatientId();
  const patients = getDemoPatients();
  const activePatient = patients.find((p) => p.id === activePatientId) || patients[0];

  // 0. POST /auth/register
  if (endpoint === '/auth/register' && method === 'POST') {
    const body = options.body || {};
    return {
      success: true,
      user: {
        id: 'demo-patient-custom-' + Date.now(),
        email: body.email || 'user@example.com',
        role: 'PATIENT',
        firstName: body.firstName || 'Jesus',
        lastName: body.lastName || 'Christ'
      },
      token: 'demo-mock-jwt-token-key-2026',
      accessToken: 'demo-mock-jwt-token-key-2026'
    };
  }

  // 0.1 POST /auth/login
  if (endpoint === '/auth/login' && method === 'POST') {
    const body = options.body || {};
    const match = patients.find((p) => p.email.toLowerCase() === body.email?.toLowerCase()) || patients[0];
    return {
      success: true,
      user: {
        id: match.id,
        email: match.email,
        role: match.role || 'PATIENT',
        firstName: match.name.split(' ')[0],
        lastName: match.name.split(' ')[1]
      },
      token: 'demo-mock-jwt-token-key-2026',
      accessToken: 'demo-mock-jwt-token-key-2026'
    };
  }

  // 1. GET /dashboard
  if (endpoint === '/dashboard' && method === 'GET') {
    const latestPred = activePatient.predictions.length > 0
      ? activePatient.predictions[activePatient.predictions.length - 1]
      : null;
    return {
      success: true,
      user: {
        id: activePatient.id,
        email: activePatient.email,
        role: activePatient.role,
        firstName: activePatient.name.split(' ')[0],
        lastName: activePatient.name.split(' ')[1]
      },
      cardioRisk: latestPred ? {
        riskLevel: latestPred.riskLevel,
        riskScore: latestPred.riskScore,
        modelName: latestPred.modelName,
        confidenceScore: latestPred.confidenceScore,
        id: latestPred.id
      } : null,
      healthScore: activePatient.healthScore,
      // Include predictions array with full factors so DashboardPage can read heartRate
      predictions: activePatient.predictions.map((p) => ({
        id: p.id,
        riskLevel: p.riskLevel,
        riskScore: p.riskScore,
        healthScore: p.healthScore,
        createdAt: p.createdAt,
        factors: p.factors,
        shapExplanation: p.shapExplanation
      })),
      lifestyleSummary: {
        water: activePatient.logs.reduce((sum, l) => sum + (l.waterIntake || 0), 0) / (activePatient.logs.length || 1),
        steps: activePatient.logs.reduce((sum, l) => sum + (l.stepsCount || 0), 0) / (activePatient.logs.length || 1),
        activeMins: activePatient.logs.reduce((sum, l) => sum + (l.activeMins || 0), 0) / (activePatient.logs.length || 1),
        sleep: activePatient.logs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / (activePatient.logs.length || 1)
      },
      badges: [
        { badgeName: 'CARDIAC_SHIELD', awardedAt: new Date().toISOString() },
        { badgeName: 'HYDRATION_HERO', awardedAt: new Date().toISOString() }
      ]
    };
  }

  // 2. GET /prediction/history
  if (endpoint === '/prediction/history' && method === 'GET') {
    return {
      success: true,
      history: activePatient.predictions
    };
  }

  // 3. GET /lifestyle
  if (endpoint === '/lifestyle' && method === 'GET') {
    return {
      success: true,
      logs: activePatient.logs
    };
  }

  // 4. POST /lifestyle
  if (endpoint === '/lifestyle' && method === 'POST') {
    const body = options.body;
    const newLog = {
      id: 'log-new-' + Date.now(),
      date: new Date().toISOString(),
      waterIntake: Number(body.waterIntake) || 0,
      sleepHours: Number(body.sleepHours) || 0,
      stepsCount: Number(body.stepsCount) || 0,
      activeMins: Number(body.activeMins) || 0,
      stressLevel: Number(body.stressLevel) || 5
    };

    activePatient.logs = [newLog, ...activePatient.logs];
    // Dynamic recalculation of healthScore slightly based on logs
    let newScore = activePatient.healthScore;
    if (newLog.stepsCount > 10000 && newLog.waterIntake >= 2.5 && newLog.sleepHours >= 7) {
      newScore = Math.min(100, newScore + 4);
    } else if (newLog.stepsCount < 3000 || newLog.sleepHours < 5) {
      newScore = Math.max(10, newScore - 4);
    }
    activePatient.healthScore = newScore;

    saveDemoPatients(patients);
    return { success: true, log: newLog };
  }

  // 5. GET /reminders
  if (endpoint === '/reminders' && method === 'GET') {
    return {
      success: true,
      reminders: activePatient.reminders
    };
  }

  // 6. POST /reminders
  if (endpoint === '/reminders' && method === 'POST') {
    const body = options.body;
    const newRem = {
      id: 'rem-new-' + Date.now(),
      title: body.title,
      time: body.time,
      type: body.type,
      completed: false
    };
    activePatient.reminders = [newRem, ...activePatient.reminders];
    saveDemoPatients(patients);
    return { success: true, reminder: newRem };
  }

  // 7. DELETE /reminders/:id
  if (endpoint.startsWith('/reminders/') && method === 'DELETE') {
    const remId = endpoint.split('/')[2];
    activePatient.reminders = activePatient.reminders.filter((r) => r.id !== remId);
    saveDemoPatients(patients);
    return { success: true };
  }

  // 8. GET /family
  if (endpoint === '/family' && method === 'GET') {
    // Return other presentation profiles as linked members
    const otherPatients = patients.filter((p) => p.id !== activePatientId);
    return {
      success: true,
      members: otherPatients.map((op) => ({
        id: op.id,
        name: op.name,
        relationship: op.relationship || 'FAMILY',
        email: op.email,
        linkedUser: {
          predictions: op.predictions
        }
      }))
    };
  }

  // 9. POST /family
  if (endpoint === '/family' && method === 'POST') {
    const body = options.body;
    const newMember = {
      id: 'member-new-' + Date.now(),
      name: body.name,
      relationship: body.relationship,
      email: body.email || 'linked@demo.com',
      linkedUser: {
        predictions: [
          { riskLevel: 'LOW', createdAt: new Date().toISOString() }
        ]
      }
    };
    // Save to temp array (not strictly binding to avoid cluttering demo patients)
    return { success: true, member: newMember };
  }

  // 10. POST /prediction
  if (endpoint === '/prediction' && method === 'POST') {
    const body = options.body;
    const age = Number(body.age) || 45;
    const systolic = Number(body.systolicBP) || 120;
    const cholesterol = Number(body.cholesterol) || 200;
    const stress = Number(body.stressLevel) || 5;
    const exercise = Number(body.exerciseFrequency) || 3;
    const rhr = Number(body.heartRate) || 72;

    // Direct clinical rules simulation for the college project prediction wizard:
    let riskLevel: 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
    let riskScore = 15;
    let score = 85;

    if (systolic >= 160 || cholesterol >= 260 || body.ecgResult === 'LV_HYPERTROPHY' || (systolic > 140 && body.familyHistory)) {
      riskLevel = 'HIGH';
      riskScore = 84;
      score = 42;
    } else if (systolic >= 130 || cholesterol >= 220 || stress >= 7 || body.smoking) {
      riskLevel = 'MODERATE';
      riskScore = 52;
      score = 64;
    }

    const newPred = {
      id: 'pred-new-' + Date.now(),
      createdAt: new Date().toISOString(),
      riskLevel,
      riskScore,
      modelName: riskLevel === 'HIGH' ? 'XGBoost Classifier (ROC-AUC: 0.942)' : riskLevel === 'MODERATE' ? 'Random Forest (ROC-AUC: 0.885)' : 'Gradient Boosting (ROC-AUC: 0.912)',
      confidenceScore: riskLevel === 'HIGH' ? 0.94 : riskLevel === 'MODERATE' ? 0.88 : 0.96,
      healthScore: score,
      plainExplanation: `Risk assessed as ${riskLevel} due to systolic BP of ${systolic} mmHg and stress level of ${stress}/10. Attributions loaded in game-theoretic SHAP matrix below.`,
      factors: {
        age,
        gender: body.gender,
        height: Number(body.height),
        weight: Number(body.weight),
        bmi: parseFloat((Number(body.weight) / ((Number(body.height) / 100) ** 2)).toFixed(1)),
        systolicBP: systolic,
        diastolicBP: Number(body.diastolicBP),
        cholesterol,
        heartRate: rhr,
        bloodSugar: Number(body.bloodSugar),
        ecgResult: body.ecgResult,
        exerciseFrequency: exercise,
        smoking: body.smoking,
        alcohol: body.alcohol,
        diabetes: body.diabetes,
        familyHistory: body.familyHistory,
        chestPainType: body.chestPainType,
        sleepDuration: body.sleepDuration,
        stressLevel: stress
      },
      shapExplanation: [
        { feature: 'Systolic BP', value: `${systolic} mmHg`, shap_value: systolic > 140 ? 0.082 : -0.034, importance: 0.32, impact: systolic > 140 ? 'INCREASES_RISK' : 'REDUCES_RISK' },
        { feature: 'Cholesterol', value: `${cholesterol} mg/dL`, shap_value: cholesterol > 220 ? 0.054 : -0.021, importance: 0.22, impact: cholesterol > 220 ? 'INCREASES_RISK' : 'REDUCES_RISK' },
        { feature: 'Stress Level', value: `${stress}/10`, shap_value: stress >= 7 ? 0.041 : -0.015, importance: 0.16, impact: stress >= 7 ? 'INCREASES_RISK' : 'REDUCES_RISK' },
        { feature: 'Exercise Days', value: `${exercise} d/wk`, shap_value: exercise >= 4 ? -0.045 : 0.022, importance: 0.14, impact: exercise >= 4 ? 'REDUCES_RISK' : 'INCREASES_RISK' },
        { feature: 'Age Factor', value: `${age} yrs`, shap_value: age > 50 ? 0.032 : -0.028, importance: 0.10, impact: age > 50 ? 'INCREASES_RISK' : 'REDUCES_RISK' }
      ]
    };

    activePatient.predictions = [newPred, ...activePatient.predictions];
    activePatient.healthScore = score;
    activePatient.riskLevel = riskLevel;
    activePatient.factors = {
      ...activePatient.factors,
      ...newPred.factors
    };
    saveDemoPatients(patients);
    return { success: true, prediction: newPred, healthScore: score };
  }

  // 11. GET /chat/sessions
  if (endpoint === '/chat/sessions' && method === 'GET') {
    return {
      success: true,
      sessions: activePatient.chatSessions
    };
  }

  // 12. GET /chat/sessions/:id
  if (endpoint.startsWith('/chat/sessions/') && method === 'GET') {
    const sessId = endpoint.split('/')[3];
    return {
      success: true,
      messages: activePatient.chatMessages[sessId] || []
    };
  }

  // 13. POST /chat/sessions
  if (endpoint === '/chat/sessions' && method === 'POST') {
    const newSessId = 'sess-new-' + Date.now();
    const newSess = {
      id: newSessId,
      title: 'Consultation ' + new Date().toLocaleDateString()
    };
    activePatient.chatSessions = [newSess, ...activePatient.chatSessions];
    activePatient.chatMessages[newSessId] = [];
    saveDemoPatients(patients);
    return { success: true, session: newSess };
  }

  // 14. POST /chat/message
  if (endpoint === '/chat/message' && method === 'POST') {
    const { sessionId, message } = options.body;
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token-123' },
        body: JSON.stringify({ sessionId, message }),
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      console.error('Chat API Error Response:', errData);
      throw new Error(errData.message || 'HridyaAI is temporarily unavailable.');
    } catch (e: any) {
      console.error('Chat API Error:', e);
      throw new Error('HridyaAI is temporarily unavailable.');
    }
  }

  // 15. POST /chat/report/upload
  if (endpoint === '/chat/report/upload' && method === 'POST') {
    const body = options.body;
    const mockReport = {
      title: body.fileName || 'BloodTest_July2026.pdf',
      summary: "CBC and Lipid blood profiles loaded. Total Cholesterol: 260 mg/dL (High Risk), Fasting Glucose: 135 mg/dL (Elevated). Blood pressure: 160 mmHg.",
      parsedValues: {
        cholesterol: 260,
        bloodSugar: 135,
        systolicBP: 160,
        diastolicBP: 95
      }
    };

    // Update active patient vitals to mock report values!
    activePatient.factors.cholesterol = 260;
    activePatient.factors.bloodSugar = 135;
    activePatient.factors.systolicBP = 160;
    activePatient.factors.diastolicBP = 95;
    saveDemoPatients(patients);

    return { success: true, report: mockReport };
  }

  // 16. GET /doctor/patients
  if (endpoint === '/doctor/patients' && method === 'GET') {
    return {
      success: true,
      patients: patients.map((p) => ({
        id: p.id,
        profile: {
          firstName: p.name.split(' ')[0],
          lastName: p.name.split(' ')[1]
        },
        predictions: p.predictions,
        logs: p.logs,
        notes: p.notes
      }))
    };
  }

  // 17. GET /doctor/notes/:id
  if (endpoint.startsWith('/doctor/notes/') && method === 'GET') {
    const patId = endpoint.split('/')[3];
    const pat = patients.find((p) => p.id === patId) || activePatient;
    return {
      success: true,
      notes: pat.notes
    };
  }

  // 18. POST /doctor/note
  if (endpoint === '/doctor/note' && method === 'POST') {
    const { patientId, note } = options.body;
    const pat = patients.find((p) => p.id === patientId);
    if (pat) {
      const newNote = {
        id: 'note-new-' + Date.now(),
        note,
        createdAt: new Date().toISOString(),
        doctor: { profile: { lastName: 'Vance' } }
      };
      pat.notes = [newNote, ...pat.notes];
      saveDemoPatients(patients);
      return { success: true, note: newNote };
    }
    return { success: false, message: 'Patient not found' };
  }

  // 19. GET /maps/nearby
  if (endpoint.startsWith('/maps/nearby') && method === 'GET') {
    const url = new URL(endpoint, 'http://localhost');
    let lat = parseFloat(url.searchParams.get('lat') || '28.6139');
    let lng = parseFloat(url.searchParams.get('lng') || '77.2090');
    if (isNaN(lat) || isNaN(lng)) {
      lat = 28.6139;
      lng = 77.2090;
    }
    const typeStr = url.searchParams.get('type') || 'all';

    const rawPlaces = [
      {
        id: 'hosp-1',
        name: 'Metro Cardiac Super Speciality Center',
        address: 'Sector 12, Noida, UP',
        phone: '+91 120 422 6666',
        lat: lat + 0.004,
        lng: lng - 0.003,
        type: 'HOSPITAL',
        distance: '0.8 km',
        rating: 4.8
      },
      {
        id: 'hosp-2',
        name: 'Apollo Heart Institute',
        address: 'Sarita Vihar, Mathura Road, New Delhi',
        phone: '+91 11 2692 5858',
        lat: lat - 0.005,
        lng: lng + 0.006,
        type: 'CARDIOLOGIST',
        distance: '1.2 km',
        rating: 4.9
      },
      {
        id: 'hosp-3',
        name: 'Max Heart & Vascular Hospital',
        address: 'Press Enclave Road, Saket, New Delhi',
        phone: '+91 11 2651 5050',
        lat: lat + 0.008,
        lng: lng - 0.007,
        type: 'HOSPITAL',
        distance: '2.4 km',
        rating: 4.7
      },
      {
        id: 'pharm-1',
        name: 'Guardian Lifecare Chemist',
        address: 'Connaught Place, New Delhi',
        phone: '+91 11 4151 3434',
        lat: lat - 0.002,
        lng: lng - 0.004,
        type: 'PHARMACY',
        distance: '0.5 km',
        rating: 4.5
      },
      {
        id: 'gym-1',
        name: 'Gold Gym & Cardio Center',
        address: 'Noida Sector 62, UP',
        phone: '+91 120 488 9090',
        lat: lat + 0.006,
        lng: lng + 0.003,
        type: 'GYM',
        distance: '1.5 km',
        rating: 4.6
      },
      {
        id: 'park-1',
        name: 'Lodi Gardens Running Track',
        address: 'Lodhi Estate, New Delhi',
        phone: 'N/A',
        lat: lat - 0.007,
        lng: lng - 0.009,
        type: 'PARK',
        distance: '3.1 km',
        rating: 4.9
      }
    ];

    const filteredPlaces = typeStr === 'all'
      ? rawPlaces
      : rawPlaces.filter(p => p.type.toLowerCase() === typeStr.toLowerCase());

    return {
      success: true,
      places: filteredPlaces
    };
  }

  // 20. GET /digital-twin
  if (endpoint.startsWith('/digital-twin')) {
    return {
      success: true,
      digitalTwin: {
        id: 'twin-demo-1',
        userId: activePatient.id,
        heartRate: activePatient.factors.heartRate,
        hrv: 48.5,
        systolicBP: activePatient.factors.systolicBP,
        diastolicBP: activePatient.factors.diastolicBP,
        spo2: 98.5,
        activityMins: activePatient.factors.exerciseFrequency * 30,
        sleepHours: activePatient.factors.sleepDuration,
        ecgStatus: activePatient.factors.ecgResult,
        riskScore: activePatient.healthScore ? (100 - activePatient.healthScore) : 25.0,
        riskLevel: activePatient.riskLevel,
        dataQuality: 'HIGH',
        confidenceScore: 0.95,
        isSimulated: false,
        lastUpdated: new Date().toISOString(),
      }
    };
  }

  // 21. GET /alerts
  if (endpoint.startsWith('/alerts')) {
    return {
      success: true,
      alerts: [
        {
          id: 'alert-demo-1',
          level: activePatient.riskLevel === 'HIGH' ? 'HIGH' : 'MODERATE',
          title: activePatient.riskLevel === 'HIGH' ? 'Elevated Systolic Blood Pressure Warning' : 'Moderate Cardio Advisory',
          message: `Patient exhibits ${activePatient.factors.systolicBP} mmHg systolic blood pressure reading.`,
          status: 'TRIGGERED',
          createdAt: new Date().toISOString(),
        }
      ]
    };
  }

  // 22. GET & POST /audit
  if (endpoint.startsWith('/audit')) {
    if (endpoint.includes('/verify')) {
      return {
        success: true,
        verification: {
          status: 'VALID',
          totalLogs: activePatient.logs?.length || 12,
          message: 'Successfully verified tamper-evident integrity across all SHA-256 blocks.',
        }
      };
    }
    return {
      success: true,
      logs: [
        {
          id: 'audit-demo-1',
          action: 'EXECUTE_CARDIAC_PREDICTION',
          eventType: 'RUN_PREDICTION',
          details: `Executed multi-horizon prediction for ${activePatient.name}. Risk: ${activePatient.riskLevel} (${activePatient.factors.systolicBP} mmHg).`,
          previousHash: 'GENESIS_BLOCK_00000000000000000000000000000000',
          currentHash: 'c8f9a2b13e4f506a78901234567890abcdef1234567890abcdef1234567890ab',
          createdAt: new Date().toISOString(),
        }
      ]
    };
  }

  // 23. GET /models
  if (endpoint.startsWith('/models')) {
    return {
      success: true,
      models: [
        { name: 'XGBoost & LightGBM Multi-Model Ensemble', version: 'v2.1-ClinicalEnsemble', modelType: 'Multi-Model Ensemble', rocAuc: 0.961, f1Score: 0.938, status: 'ACTIVE' },
        { name: 'Framingham Heart Risk Model', version: 'v2.0-FraminghamLightGBM', modelType: 'LightGBM Classifier', rocAuc: 0.938, f1Score: 0.908, status: 'ACTIVE' },
        { name: 'PhysioNet ECG Arrhythmia Detector', version: 'v1.9-PhysioNetRandomForest', modelType: 'Random Forest', rocAuc: 0.945, f1Score: 0.921, status: 'ACTIVE' },
      ]
    };
  }

  // 24. GET /devices
  if (endpoint.startsWith('/devices')) {
    return {
      success: true,
      devices: [
        { id: 'dev-1', name: 'Apple Watch Series 9', deviceType: 'SMARTWATCH', deviceIdentifier: 'DEV-AW9-84920', status: 'ACTIVE', lastSeen: new Date().toISOString() },
        { id: 'dev-2', name: 'KardiaMobile 6L ECG', deviceType: 'ECG_MONITOR', deviceIdentifier: 'DEV-KM6-10492', status: 'ACTIVE', lastSeen: new Date().toISOString() },
      ]
    };
  }

  // 25. POST /risk/simulate
  if (endpoint.startsWith('/risk/simulate')) {
    return {
      success: true,
      originalRisk: 28,
      modifiedRisk: 19,
      delta: -9,
      explanation: 'Modifying systolic blood pressure to 120 mmHg reduces predicted cardiovascular risk by 9 percentage points.',
      impact: 'improvement'
    };
  }

  // 26. GET /analytics
  if (endpoint.startsWith('/analytics')) {
    return {
      success: true,
      analytics: {
        summary: { totalCohortCount: 1240, totalPredictionsGenerated: 4890, totalAlertsTriggered: 340 },
        riskDistribution: { HIGH: 280, MODERATE: 450, LOW: 510 }
      }
    };
  }

  // 27. GET & POST /admin/retention
  if (endpoint.startsWith('/admin/retention')) {
    if (endpoint.endsWith('/run')) {
      return {
        success: true,
        result: {
          sensorDataDeleted: 0,
          digitalTwinDeleted: 0,
          auditLogsDeleted: 0,
          cleanedAt: new Date().toISOString(),
        }
      };
    }
    return {
      success: true,
      status: {
        retentionConfig: { sensorDataDays: 90, digitalTwinDays: 180, auditLogDays: 730 },
        lastCleanupAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        nextScheduledCleanupAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        lastCleanupResult: { sensorDataDeleted: 0, digitalTwinDeleted: 0, auditLogsDeleted: 0 }
      }
    };
  }

  // Fallback
  return { success: true };
}
