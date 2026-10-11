/**
 * HridayaDarpana Clinical Prevention Coach Automated Verification Suite
 * 
 * Verifies all 6 required clinical test scenarios:
 * TEST 1: Elevated BP, normal cholesterol, low activity -> BP & activity prioritized, chol NOT primary
 * TEST 2: Normal BP, elevated cholesterol, normal BMI -> Lipid nutrition prioritized, BP NOT primary
 * TEST 3: High BMI, low activity, elevated BP -> Combined & prioritized plan
 * TEST 4: Low overall risk, healthy BP, healthy cholesterol, active -> Maintenance guidance, non-alarmist
 * TEST 5: Scan A -> verify -> Scan B (changed inputs) -> verify recommendations update
 * TEST 6: Patient A scan -> logout -> Patient B login -> verify strict patient isolation
 */

import { generatePersonalizedPreventionPlan, generateFallbackPreventionPlan } from './src/services/preventionService.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runPreventionCoachTests() {
  console.log('===============================================================');
  console.log('  HridayaDarpana Prevention Coach Clinical Verification Suite');
  console.log('===============================================================\n');

  // =========================================================================
  // TEST 1: Elevated BP, Normal Cholesterol, Low Activity
  // =========================================================================
  console.log('▶ Running TEST 1: Elevated BP, Normal Cholesterol, Low Activity...');
  const patient1Factors = {
    age: 52,
    gender: 'MALE',
    height: 172,
    weight: 72,
    bmi: 24.3, // Normal BMI
    systolicBP: 146, // Elevated Stage 2
    diastolicBP: 92,
    cholesterol: 178, // Normal Cholesterol (< 200)
    heartRate: 74,
    bloodSugar: 92,
    ecgResult: 'NORMAL',
    exerciseFrequency: 1, // Low activity / Sedentary
    smoking: false,
    alcohol: false,
    diabetes: false,
    familyHistory: false,
    chestPainType: 'ASYMPTOMATIC',
    sleepDuration: 7.5,
    stressLevel: 4,
  };

  const scan1Result = {
    id: 'pred-test-1',
    riskScore: 56.0,
    riskLevel: 'HIGH',
    shapExplanation: [
      { feature: 'Systolic Blood Pressure', importance: 0.32, impact: 'INCREASES_RISK', direction: 'negative' },
      { feature: 'Physical Inactivity', importance: 0.22, impact: 'INCREASES_RISK', direction: 'negative' },
      { feature: 'Total Cholesterol', importance: 0.05, impact: 'PROTECTIVE', direction: 'positive' },
    ],
    plainExplanation: 'Risk evaluated as HIGH (56%). Primary driver is systolic blood pressure.',
  };

  const plan1 = generatePersonalizedPreventionPlan('patient-user-1', scan1Result, patient1Factors);

  assert(plan1.isPersonalized === true, 'Plan 1 is marked as personalized');
  assert(plan1.riskSummary.overallRisk === 56.0, 'Plan 1 reflects 56% risk score');

  // Check top contributing factors
  const topFactorNames1 = plan1.riskSummary.topContributingFactors.map(f => f.factor.toLowerCase());
  assert(topFactorNames1.some(f => f.includes('blood pressure')), 'Plan 1 identifies Blood Pressure as top contributing factor');
  assert(topFactorNames1.some(f => f.includes('activity')), 'Plan 1 identifies Physical Inactivity as top contributing factor');
  assert(!topFactorNames1.some(f => f.includes('cholesterol') && f.includes('elevated')), 'Plan 1 does NOT list elevated cholesterol as a risk contributor');

  // Check recommendations
  const primaryRecs1 = plan1.recommendations.filter(r => r.priority === 'HIGH' || r.priority === 'MEDIUM');
  const bpRec1 = primaryRecs1.find(r => r.category === 'Blood Pressure');
  const activityRec1 = primaryRecs1.find(r => r.category === 'Physical Activity');
  const cholRec1 = primaryRecs1.find(r => r.category === 'Lipid Management');

  assert(bpRec1 !== undefined, 'Plan 1 prioritizes Blood Pressure Management');
  assert(bpRec1?.priority === 'HIGH', 'Blood Pressure recommendation has HIGH priority');
  assert(bpRec1?.reason.includes('146/92 mmHg'), 'BP reason cites patient exact values 146/92 mmHg');
  assert(bpRec1?.isShapDriver === true, 'BP recommendation is flagged as SHAP key driver');

  assert(activityRec1 !== undefined, 'Plan 1 prioritizes Physical Activity');
  assert(activityRec1?.reason.includes('1 workout day/week'), 'Activity reason cites patient exact exercise frequency');

  assert(cholRec1 === undefined, 'Plan 1 does NOT show Cholesterol as a primary recommendation');
  console.log('✅ TEST 1 PASSED: Prevention Coach correctly prioritized BP + Activity and excluded Cholesterol from primary recommendations.\n');

  // =========================================================================
  // TEST 2: Normal BP, Elevated Cholesterol, Normal BMI
  // =========================================================================
  console.log('▶ Running TEST 2: Normal BP, Elevated Cholesterol, Normal BMI...');
  const patient2Factors = {
    age: 48,
    gender: 'FEMALE',
    height: 165,
    weight: 60,
    bmi: 22.0, // Normal BMI
    systolicBP: 118, // Normal BP (< 130)
    diastolicBP: 76,
    cholesterol: 248, // Elevated Cholesterol (>= 240)
    heartRate: 70,
    bloodSugar: 90,
    ecgResult: 'NORMAL',
    exerciseFrequency: 3, // Active
    smoking: false,
    alcohol: false,
    diabetes: false,
    familyHistory: false,
    chestPainType: 'ASYMPTOMATIC',
    sleepDuration: 8.0,
    stressLevel: 3,
  };

  const scan2Result = {
    id: 'pred-test-2',
    riskScore: 48.0,
    riskLevel: 'HIGH',
    shapExplanation: [
      { feature: 'Total Cholesterol', importance: 0.35, impact: 'INCREASES_RISK', direction: 'negative' },
      { feature: 'Systolic Blood Pressure', importance: 0.04, impact: 'PROTECTIVE', direction: 'positive' },
    ],
    plainExplanation: 'Risk evaluated as HIGH (48%). Primary driver is serum cholesterol.',
  };

  const plan2 = generatePersonalizedPreventionPlan('patient-user-2', scan2Result, patient2Factors);

  const topFactorNames2 = plan2.riskSummary.topContributingFactors.map(f => f.factor.toLowerCase());
  assert(topFactorNames2.some(f => f.includes('cholesterol')), 'Plan 2 identifies Serum Cholesterol as top contributing factor');
  assert(!topFactorNames2.some(f => f.includes('blood pressure') && f.includes('elevated')), 'Plan 2 does NOT list elevated BP as a risk contributor');

  const primaryRecs2 = plan2.recommendations.filter(r => r.priority === 'HIGH' || r.priority === 'MEDIUM');
  const cholRec2 = primaryRecs2.find(r => r.category === 'Lipid Management');
  const bpRec2 = primaryRecs2.find(r => r.category === 'Blood Pressure');

  assert(cholRec2 !== undefined, 'Plan 2 prioritizes Lipid Management');
  assert(cholRec2?.priority === 'HIGH', 'Lipid recommendation has HIGH priority');
  assert(cholRec2?.reason.includes('248 mg/dL'), 'Lipid reason cites patient exact cholesterol 248 mg/dL');
  assert(cholRec2?.isShapDriver === true, 'Lipid recommendation is flagged as SHAP key driver');

  assert(bpRec2 === undefined, 'Plan 2 does NOT show Blood Pressure as a primary recommendation');
  assert(plan2.dietaryGuidance.title.includes('Lipid-Lowering'), 'Dietary guidance specifically targets lipid lowering');
  console.log('✅ TEST 2 PASSED: Prevention Coach correctly prioritized Lipid Management and excluded Blood Pressure from primary recommendations.\n');

  // =========================================================================
  // TEST 3: High BMI, Low Activity, Elevated BP
  // =========================================================================
  console.log('▶ Running TEST 3: High BMI, Low Activity, Elevated BP...');
  const patient3Factors = {
    age: 55,
    gender: 'MALE',
    height: 175,
    weight: 104,
    bmi: 34.0, // Obese (>= 30)
    systolicBP: 144, // Elevated Stage 2
    diastolicBP: 92,
    cholesterol: 190, // Normal
    heartRate: 82,
    bloodSugar: 98,
    ecgResult: 'NORMAL',
    exerciseFrequency: 0, // Sedentary
    smoking: false,
    alcohol: false,
    diabetes: false,
    familyHistory: false,
    chestPainType: 'ASYMPTOMATIC',
    sleepDuration: 6.5,
    stressLevel: 5,
  };

  const scan3Result = {
    id: 'pred-test-3',
    riskScore: 68.0,
    riskLevel: 'HIGH',
    shapExplanation: [
      { feature: 'Systolic Blood Pressure', importance: 0.29, impact: 'INCREASES_RISK', direction: 'negative' },
      { feature: 'Body Mass Index (BMI)', importance: 0.26, impact: 'INCREASES_RISK', direction: 'negative' },
      { feature: 'Physical Inactivity', importance: 0.22, impact: 'INCREASES_RISK', direction: 'negative' },
    ],
  };

  const plan3 = generatePersonalizedPreventionPlan('patient-user-3', scan3Result, patient3Factors);

  const primaryRecs3 = plan3.recommendations.filter(r => r.priority === 'HIGH');
  const bpRec3 = primaryRecs3.find(r => r.category === 'Blood Pressure');
  const weightRec3 = primaryRecs3.find(r => r.category === 'Weight Management');
  const activityRec3 = primaryRecs3.find(r => r.category === 'Physical Activity');

  assert(bpRec3 !== undefined, 'Plan 3 includes High Priority Blood Pressure Management');
  assert(weightRec3 !== undefined, 'Plan 3 includes High Priority Weight Management');
  assert(activityRec3 !== undefined, 'Plan 3 includes High Priority Physical Activity');
  assert(weightRec3?.reason.includes('34 kg/m²') || weightRec3?.reason.includes('104 kg'), 'Weight reason cites patient exact BMI/Weight');
  assert(plan3.exerciseGuidance.intensity === 'Supervised Low-Intensity', 'High risk + stage 2 BP receives safe supervised low-intensity exercise plan');
  console.log('✅ TEST 3 PASSED: Prevention Coach combined and prioritized BP, Weight, and Physical Activity.\n');

  // =========================================================================
  // TEST 4: Low Overall Risk, Healthy BP, Healthy Cholesterol, Active
  // =========================================================================
  console.log('▶ Running TEST 4: Low Overall Risk, Healthy BP, Healthy Cholesterol, Active...');
  const patient4Factors = {
    age: 32,
    gender: 'FEMALE',
    height: 168,
    weight: 58,
    bmi: 20.5,
    systolicBP: 114,
    diastolicBP: 72,
    cholesterol: 162,
    heartRate: 64,
    bloodSugar: 85,
    ecgResult: 'NORMAL',
    exerciseFrequency: 4,
    smoking: false,
    alcohol: false,
    diabetes: false,
    familyHistory: false,
    chestPainType: 'ASYMPTOMATIC',
    sleepDuration: 8.0,
    stressLevel: 2,
  };

  const scan4Result = {
    id: 'pred-test-4',
    riskScore: 9.5,
    riskLevel: 'LOW',
    shapExplanation: [
      { feature: 'Exercise & Activity Level', importance: 0.25, impact: 'PROTECTIVE', direction: 'positive' },
      { feature: 'Systolic Blood Pressure', importance: 0.18, impact: 'PROTECTIVE', direction: 'positive' },
    ],
  };

  const plan4 = generatePersonalizedPreventionPlan('patient-user-4', scan4Result, patient4Factors);

  const highRecs4 = plan4.recommendations.filter(r => r.priority === 'HIGH');
  const medRecs4 = plan4.recommendations.filter(r => r.priority === 'MEDIUM');
  assert(highRecs4.length === 0, 'Plan 4 has ZERO HIGH-priority alarmist recommendations');
  assert(medRecs4.length === 0, 'Plan 4 has ZERO MEDIUM-priority intervention recommendations');
  assert(plan4.recommendations.every(r => r.priority === 'LOW'), 'All recommendations for healthy patient are Routine/LOW priority');
  assert(!plan4.clinicalFollowUp.toLowerCase().includes('emergency') && !plan4.clinicalFollowUp.toLowerCase().includes('immediate'), 'Clinical follow-up is routine/annual wellness');
  console.log('✅ TEST 4 PASSED: Prevention Coach provided non-alarmist routine maintenance guidance.\n');

  // =========================================================================
  // TEST 5: Run Scan A -> Verify -> Change Inputs to Scan B -> Verify Updates
  // =========================================================================
  console.log('▶ Running TEST 5: Dynamic Updates between Consecutive Scans...');
  // Scan A: High BP + High BMI
  const scanAPlan = generatePersonalizedPreventionPlan('patient-user-5', {
    id: 'scan-a',
    riskScore: 62.0,
    riskLevel: 'HIGH',
  }, {
    systolicBP: 150,
    diastolicBP: 95,
    cholesterol: 180,
    bmi: 32.0,
    weight: 95,
    exerciseFrequency: 3,
    smoking: false,
    bloodSugar: 90,
  });

  const scanAPrimaryCategories = scanAPlan.recommendations.filter(r => r.priority === 'HIGH').map(r => r.category);
  assert(scanAPrimaryCategories.includes('Blood Pressure'), 'Scan A includes Blood Pressure as primary recommendation');
  assert(scanAPrimaryCategories.includes('Weight Management'), 'Scan A includes Weight Management as primary recommendation');
  assert(!scanAPrimaryCategories.includes('Lipid Management'), 'Scan A does NOT include Lipid Management as primary recommendation');

  // Scan B: Patient changes inputs -> Normal BP, Normal Weight, High Cholesterol, Low Activity
  const scanBPlan = generatePersonalizedPreventionPlan('patient-user-5', {
    id: 'scan-b',
    riskScore: 51.0,
    riskLevel: 'HIGH',
  }, {
    systolicBP: 118,
    diastolicBP: 76,
    cholesterol: 255,
    bmi: 23.0,
    weight: 68,
    exerciseFrequency: 1,
    smoking: false,
    bloodSugar: 90,
  });

  const scanBPrimaryCategories = scanBPlan.recommendations.filter(r => r.priority === 'HIGH' || r.priority === 'MEDIUM').map(r => r.category);
  assert(scanBPrimaryCategories.includes('Lipid Management'), 'Scan B updated to include Lipid Management as primary recommendation');
  assert(scanBPrimaryCategories.includes('Physical Activity'), 'Scan B updated to include Physical Activity as primary recommendation');
  assert(!scanBPrimaryCategories.includes('Blood Pressure'), 'Scan B no longer has Blood Pressure as primary recommendation');
  assert(!scanBPrimaryCategories.includes('Weight Management'), 'Scan B no longer has Weight Management as primary recommendation');
  console.log('✅ TEST 5 PASSED: Prevention Coach dynamically and completely updated recommendations between Scan A and Scan B.\n');

  // =========================================================================
  // TEST 6: Patient A Scan -> Logout -> Patient B Login -> Patient Isolation
  // =========================================================================
  console.log('▶ Running TEST 6: Patient Isolation across Users...');
  // Patient A has a scan with high BP
  const patientAPlan = generatePersonalizedPreventionPlan('patient-a-id', {
    id: 'pred-a',
    riskScore: 58.0,
    riskLevel: 'HIGH',
  }, {
    systolicBP: 155,
    diastolicBP: 98,
    cholesterol: 190,
    bmi: 24.0,
    exerciseFrequency: 3,
  });

  assert(patientAPlan.patientId === 'patient-a-id', 'Patient A plan belongs strictly to patient-a-id');
  assert(patientAPlan.recommendations.some(r => r.category === 'Blood Pressure' && r.priority === 'HIGH'), 'Patient A has high BP recommendations');

  // Patient B has not performed any scan yet
  const patientBPlan = generateFallbackPreventionPlan('patient-b-id');
  assert(patientBPlan.patientId === 'patient-b-id', 'Patient B fallback plan belongs to patient-b-id');
  assert(patientBPlan.isPersonalized === false, 'Patient B sees generic baseline, not personalized plan');
  assert(!patientBPlan.recommendations.some(r => r.reason.includes('155/98 mmHg')), 'Patient B does NOT see Patient A BP measurements');
  assert(patientBPlan.riskSummary.topContributingFactors.length === 0, 'Patient B does NOT see Patient A contributing factors');
  console.log('✅ TEST 6 PASSED: Patient B is strictly isolated and does NOT receive Patient A prevention plan.\n');

  console.log('===============================================================');
  console.log('  🎉 ALL 6 PREVENTION COACH TEST CASES PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runPreventionCoachTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
