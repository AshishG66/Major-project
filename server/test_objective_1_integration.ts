import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { updateDigitalTwinState } from './src/services/digitalTwinService.js';

const prisma = new PrismaClient();

test('Objective 1: Digital Twin & Longitudinal Health Tracking Integration Suite', async (t) => {
  const patientA_Email = `patient_a_${Date.now()}@example.com`;
  const patientB_Email = `patient_b_${Date.now()}@example.com`;

  let patientA: any;
  let patientB: any;

  t.after(async () => {
    // Cleanup test records
    try {
      if (patientA) {
        await prisma.digitalTwinState.deleteMany({ where: { userId: patientA.id } });
        await prisma.predictionFactors.deleteMany({ where: { prediction: { userId: patientA.id } } });
        await prisma.prediction.deleteMany({ where: { userId: patientA.id } });
        await prisma.userProfile.deleteMany({ where: { userId: patientA.id } });
        await prisma.user.deleteMany({ where: { id: patientA.id } });
      }
      if (patientB) {
        await prisma.digitalTwinState.deleteMany({ where: { userId: patientB.id } });
        await prisma.predictionFactors.deleteMany({ where: { prediction: { userId: patientB.id } } });
        await prisma.prediction.deleteMany({ where: { userId: patientB.id } });
        await prisma.userProfile.deleteMany({ where: { userId: patientB.id } });
        await prisma.user.deleteMany({ where: { id: patientB.id } });
      }
    } catch (e) {
      // Ignore cleanup error
    }
  });

  await t.test('1. Demographic data and baseline laboratory vitals stored and associated with patient', async () => {
    patientA = await prisma.user.create({
      data: {
        email: patientA_Email,
        passwordHash: 'hash123',
        role: 'PATIENT',
        profile: {
          create: {
            firstName: 'Aarav',
            lastName: 'Sharma',
            dateOfBirth: new Date('1985-05-15'),
            gender: 'MALE',
            height: 175.0,
            weight: 78.0,
          },
        },
      },
      include: { profile: true },
    });

    assert.ok(patientA.id);
    assert.equal(patientA.profile?.firstName, 'Aarav');
    assert.equal(patientA.profile?.height, 175.0);
    assert.equal(patientA.profile?.weight, 78.0);
  });

  await t.test('2. First visit (baseline): Digital Twin initializes with baseline tracking', async () => {
    const visit1 = await prisma.prediction.create({
      data: {
        userId: patientA.id,
        riskScore: 22.5,
        riskLevel: 'LOW',
        confidenceScore: 0.95,
        modelName: 'Hybrid XGBoost-LSTM',
        shapExplanation: [],
        plainExplanation: 'Baseline visit',
        createdAt: new Date('2025-01-10T10:00:00Z'),
        factors: {
          create: {
            age: 52,
            gender: 'MALE',
            height: 175.0,
            weight: 78.0,
            bmi: 25.5,
            systolicBP: 122,
            diastolicBP: 80,
            cholesterol: 195,
            heartRate: 72,
            bloodSugar: 94,
            ecgResult: 'NORMAL',
            exerciseFrequency: 3,
            smoking: false,
            alcohol: false,
            diabetes: false,
            familyHistory: false,
            chestPainType: 'ASYMPTOMATIC',
            sleepDuration: 7.5,
            stressLevel: 4,
          },
        },
      },
      include: { factors: true },
    });

    assert.ok(visit1.id);
    assert.equal(visit1.factors?.systolicBP, 122);

    const twinState = await updateDigitalTwinState(patientA.id);
    assert.ok(twinState);
    assert.equal(twinState.userId, patientA.id);
    assert.equal(twinState.systolicBP, 122);
    assert.equal(twinState.riskScore, 22.5);

    const mf = twinState.majorFactors as any;
    assert.ok(mf);
    assert.equal(mf.hasLongitudinalHistory, false);
    assert.equal(mf.visualCondition.condition, 'NORMAL');
  });

  await t.test('3. Second visit: Stores chronologically and computes visit-over-visit deltas and trends', async () => {
    const visit2 = await prisma.prediction.create({
      data: {
        userId: patientA.id,
        riskScore: 48.0,
        riskLevel: 'MODERATE',
        confidenceScore: 0.95,
        modelName: 'Hybrid XGBoost-LSTM',
        shapExplanation: [],
        plainExplanation: 'Second follow-up visit',
        createdAt: new Date('2025-06-15T10:00:00Z'),
        factors: {
          create: {
            age: 52,
            gender: 'MALE',
            height: 175.0,
            weight: 81.0,
            bmi: 26.4,
            systolicBP: 142, // Elevated from 122 (+20)
            diastolicBP: 88, // Elevated from 80 (+8)
            cholesterol: 230, // Elevated from 195 (+35)
            heartRate: 82, // Elevated from 72 (+10)
            bloodSugar: 110,
            ecgResult: 'NORMAL',
            exerciseFrequency: 1,
            smoking: true,
            alcohol: false,
            diabetes: false,
            familyHistory: false,
            chestPainType: 'ASYMPTOMATIC',
            sleepDuration: 6.0,
            stressLevel: 7,
          },
        },
      },
      include: { factors: true },
    });

    const twinState2 = await updateDigitalTwinState(patientA.id);
    assert.ok(twinState2);
    assert.equal(twinState2.systolicBP, 142);
    assert.equal(twinState2.riskScore, 48.0);

    const mf2 = twinState2.majorFactors as any;
    assert.equal(mf2.hasLongitudinalHistory, true);
    assert.ok(Array.isArray(mf2.longitudinalComparison));
    assert.ok(mf2.longitudinalComparison.length >= 5);

    // Verify BP comparison delta
    const sysComp = mf2.longitudinalComparison.find((c: any) => c.metric.includes('Systolic'));
    assert.ok(sysComp);
    assert.equal(sysComp.current, 142);
    assert.equal(sysComp.previous, 122);
    assert.equal(sysComp.delta, 20);
    assert.equal(sysComp.trend, 'WORSENED');

    // Verify deterministic visual condition shifted to CORONARY_FLOW_RISK due to sys >= 140 and smoking
    assert.equal(mf2.visualCondition.condition, 'CORONARY_FLOW_RISK');
    assert.equal(mf2.visualCondition.highlightRegion, 'CORONARY');
  });

  await t.test('4. Third visit (multiple visits): Chronology preserved, previous history not overwritten', async () => {
    await prisma.prediction.create({
      data: {
        userId: patientA.id,
        riskScore: 28.0,
        riskLevel: 'MODERATE',
        confidenceScore: 0.95,
        modelName: 'Hybrid XGBoost-LSTM',
        shapExplanation: [],
        plainExplanation: 'Third visit after lifestyle intervention',
        createdAt: new Date('2025-12-20T10:00:00Z'),
        factors: {
          create: {
            age: 53,
            gender: 'MALE',
            height: 175.0,
            weight: 77.0,
            bmi: 25.1,
            systolicBP: 126, // Reduced from 142 (-16)
            diastolicBP: 82,
            cholesterol: 198, // Reduced from 230 (-32)
            heartRate: 74,
            bloodSugar: 96,
            ecgResult: 'NORMAL',
            exerciseFrequency: 4,
            smoking: false,
            alcohol: false,
            diabetes: false,
            familyHistory: false,
            chestPainType: 'ASYMPTOMATIC',
            sleepDuration: 8.0,
            stressLevel: 3,
          },
        },
      },
    });

    const allVisits = await prisma.prediction.findMany({
      where: { userId: patientA.id },
      orderBy: { createdAt: 'asc' },
    });

    assert.equal(allVisits.length, 3);
    assert.equal(allVisits[0].riskScore, 22.5);
    assert.equal(allVisits[1].riskScore, 48.0);
    assert.equal(allVisits[2].riskScore, 28.0);

    const twinState3 = await updateDigitalTwinState(patientA.id);
    const mf3 = twinState3?.majorFactors as any;
    
    // Check favorable delta comparison against Visit 2
    const sysComp3 = mf3.longitudinalComparison.find((c: any) => c.metric.includes('Systolic'));
    assert.ok(sysComp3);
    assert.equal(sysComp3.current, 126);
    assert.equal(sysComp3.previous, 142);
    assert.equal(sysComp3.delta, -16);
    assert.equal(sysComp3.trend, 'IMPROVED');
  });

  await t.test('5. Missing measurements remain explicitly missing and are never fabricated as 0', async () => {
    const twinState = await prisma.digitalTwinState.findUnique({
      where: { userId: patientA.id },
    });
    const mf = twinState?.majorFactors as any;

    assert.ok(mf.missingMeasurements);
    const hdlMissing = mf.missingMeasurements.find((m: any) => m.metric.includes('HDL'));
    assert.ok(hdlMissing);
    assert.equal(hdlMissing.status, 'UNAVAILABLE_PENDING_LAB');

    const efMissing = mf.missingMeasurements.find((m: any) => m.metric.includes('Ejection Fraction'));
    assert.ok(efMissing);
    assert.equal(efMissing.status, 'UNAVAILABLE_PENDING_ECHO');
  });

  await t.test('6. Patient A and Patient B digital twin states are strictly isolated', async () => {
    patientB = await prisma.user.create({
      data: {
        email: patientB_Email,
        passwordHash: 'hash456',
        role: 'PATIENT',
        profile: {
          create: {
            firstName: 'Sneha',
            lastName: 'Rao',
            dateOfBirth: new Date('1990-08-20'),
            gender: 'FEMALE',
            height: 162.0,
            weight: 56.0,
          },
        },
      },
    });

    await prisma.prediction.create({
      data: {
        userId: patientB.id,
        riskScore: 78.5,
        riskLevel: 'CRITICAL',
        confidenceScore: 0.95,
        modelName: 'Hybrid XGBoost-LSTM',
        shapExplanation: [],
        plainExplanation: 'Severe rhythm risk',
        factors: {
          create: {
            age: 65,
            gender: 'FEMALE',
            height: 162.0,
            weight: 56.0,
            bmi: 21.3,
            systolicBP: 165,
            diastolicBP: 100,
            cholesterol: 260,
            heartRate: 115, // Severe tachycardia
            bloodSugar: 140,
            ecgResult: 'ST_T_ABNORMAL',
            exerciseFrequency: 0,
            smoking: false,
            alcohol: false,
            diabetes: true,
            familyHistory: true,
            chestPainType: 'TYPICAL',
            sleepDuration: 5.0,
            stressLevel: 9,
          },
        },
      },
    });

    const twinStateB = await updateDigitalTwinState(patientB.id);
    const twinStateA = await prisma.digitalTwinState.findUnique({ where: { userId: patientA.id } });

    assert.notEqual(twinStateA?.userId, twinStateB?.userId);
    assert.equal(twinStateA?.userId, patientA.id);
    assert.equal(twinStateB?.userId, patientB.id);

    // Patient B has tachycardia & arrhythmia
    assert.equal(twinStateB?.heartRate, 115);
    assert.equal(twinStateB?.riskScore, 78.5);
    const mfB = twinStateB?.majorFactors as any;
    assert.equal(mfB.visualCondition.condition, 'ARRHYTHMIA_RISK');

    // Patient A retains their own independent state
    assert.equal(twinStateA?.heartRate, 74);
    assert.equal(twinStateA?.riskScore, 28.0);
  });
});
