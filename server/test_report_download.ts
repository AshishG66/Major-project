import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'hridyadarpan_super_secret_jwt_key_2026';
const prisma = new PrismaClient();

async function runTests() {
  console.log('=== STARTING CLINICAL REPORT DOWNLOAD VERIFICATION ===\n');

  // Find a user with at least one prediction
  let user = await prisma.user.findFirst({
    where: { predictions: { some: {} } },
    include: { predictions: true },
  });

  if (!user) {
    // Pick the first user
    user = await prisma.user.findFirst({
      include: { predictions: true },
    });
  }

  if (!user) {
    console.error('No users found in database.');
    return;
  }

  console.log(`Found test user: ${user.email} (ID: ${user.id}) with ${user.predictions.length} predictions`);

  let predictionId = user.predictions[0]?.id;

  if (!predictionId) {
    console.log('Creating a test prediction for user...');
    const pred = await prisma.prediction.create({
      data: {
        userId: user.id,
        riskScore: 28.5,
        riskLevel: 'MODERATE',
        confidenceScore: 0.92,
        modelName: 'XGBoost & LightGBM Multi-Model Ensemble',
        modelVersion: 'v2.1-ClinicalEnsemble',
        risk30Day: 8.0,
        risk1Year: 18.5,
        risk5Year: 27.1,
        plainExplanation: 'Test evaluation generated for report download testing.',
        shapExplanation: [
          { feature: 'Systolic Blood Pressure', value: '138 mmHg', importance: 0.28, impact: 'INCREASES_RISK' },
          { feature: 'Serum Cholesterol', value: '215 mg/dL', importance: 0.22, impact: 'INCREASES_RISK' },
          { feature: 'Physical Activity', value: '4 days/wk', importance: 0.18, impact: 'PROTECTIVE' }
        ],
        factors: {
          create: {
            age: 46,
            gender: 'MALE',
            height: 176,
            weight: 78,
            bmi: 25.2,
            systolicBP: 138,
            diastolicBP: 88,
            cholesterol: 215,
            heartRate: 74,
            bloodSugar: 98,
            ecgResult: 'NORMAL',
            exerciseFrequency: 4,
            smoking: false,
            alcohol: false,
            diabetes: false,
            familyHistory: true,
            chestPainType: 'ASYMPTOMATIC',
            sleepDuration: 7.2,
            stressLevel: 4,
          }
        }
      }
    });
    predictionId = pred.id;
    console.log(`Created test prediction: ${predictionId}`);
  }

  // 1. Generate valid test patient token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'PATIENT' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`[Test 1] Testing GET ${API_URL}/prediction/report/latest with Bearer Token`);
  try {
    const res = await fetch(`${API_URL}/prediction/report/latest`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const contentType = res.headers.get('content-type');
    const disposition = res.headers.get('content-disposition');
    console.log(`Content-Type: ${contentType}`);
    console.log(`Content-Disposition: ${disposition}`);

    if (res.status === 200) {
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const pdfHeader = String.fromCharCode(...bytes.slice(0, 5));
      console.log(`Report Size: ${bytes.length} bytes`);
      console.log(`Magic Header Check: ${pdfHeader} (Expected: %PDF-)`);

      if (pdfHeader.startsWith('%PDF') && bytes.length > 2000) {
        console.log('✅ TEST 1 PASSED: Valid PDF generated and streamed successfully!\n');
      } else {
        console.error('❌ TEST 1 FAILED: Invalid PDF header or too small!\n');
      }
    } else {
      const errText = await res.text();
      console.log(`Response text: ${errText}`);
    }
  } catch (err: any) {
    console.error('Error in Test 1:', err.message);
  }

  // 2. Query token test (for browser direct tab links)
  console.log(`[Test 2] Testing GET ${API_URL}/prediction/report/latest?token=... (Query Token)`);
  try {
    const res = await fetch(`${API_URL}/prediction/report/latest?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });

    console.log(`Status: ${res.status}`);
    const contentType = res.headers.get('content-type');
    if (res.status === 200 && contentType?.includes('application/pdf')) {
      const buffer = await res.arrayBuffer();
      console.log(`Query Token Report Size: ${buffer.byteLength} bytes`);
      console.log('✅ TEST 2 PASSED: Query token auth succeeded for browser tab downloads!\n');
    } else {
      console.error(`❌ TEST 2 FAILED: Status ${res.status}`);
    }
  } catch (err: any) {
    console.error('Error in Test 2:', err.message);
  }

  // 2b. Specific report ID test
  console.log(`[Test 2b] Testing GET ${API_URL}/prediction/report/${predictionId} (Specific ID)`);
  try {
    const res = await fetch(`${API_URL}/prediction/report/${predictionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    if (res.status === 200) {
      const buffer = await res.arrayBuffer();
      console.log(`Specific ID Report Size: ${buffer.byteLength} bytes`);
      console.log('✅ TEST 2b PASSED: Specific prediction report downloaded successfully!\n');
    } else {
      console.error(`❌ TEST 2b FAILED: Status ${res.status}`);
    }
  } catch (err: any) {
    console.error('Error in Test 2b:', err.message);
  }

  // 3. Security / Patient Isolation test (Unauthenticated or fake token)
  console.log(`[Test 3] Testing Security: Unauthenticated request to /report/latest`);
  try {
    const res = await fetch(`${API_URL}/prediction/report/latest`, {
      method: 'GET',
    });

    console.log(`Status: ${res.status} (Expected: 401)`);
    if (res.status === 401) {
      console.log('✅ TEST 3 PASSED: Unauthenticated access rejected with 401!\n');
    } else {
      console.error(`❌ TEST 3 FAILED: Expected 401, got ${res.status}`);
    }
  } catch (err: any) {
    console.error('Error in Test 3:', err.message);
  }

  console.log('=== REPORT DOWNLOAD VERIFICATION COMPLETED ===');
}

runTests();
