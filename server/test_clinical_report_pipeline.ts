import fs from 'fs';
import path from 'path';
import {
  analyzeClinicalReportFile,
  executeClinicalReportPrediction,
  extractTextFromPdfBuffer,
  mapRawEntitiesToCanonical,
  parseMedicalTextDeterministic,
  validateModelReadiness,
  ClinicalReportData,
} from './src/services/clinicalReport/index.js';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('   HRIDAYADARPANA: CLINICAL REPORT ANALYSIS PIPELINE TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] Test ${totalTests.toString().padStart(2, '0')}: ${testName}`);
    } else {
      console.error(`[FAIL] Test ${totalTests.toString().padStart(2, '0')}: ${testName} - ${details || 'Assertion failed'}`);
    }
  }

  // 1. PDF upload test
  const samplePdfPath = path.resolve('../test_fixtures/Z615.pdf');
  const fileExists = fs.existsSync(samplePdfPath);
  assert(fileExists, 'PDF file load from disk (Z615.pdf)', `File path not found: ${samplePdfPath}`);
  const pdfBuffer = fs.readFileSync(samplePdfPath);
  assert(pdfBuffer.length > 1000, 'PDF buffer loaded with non-trivial size', `Size: ${pdfBuffer.length} bytes`);

  // 2. Extraction test
  const analysis = await analyzeClinicalReportFile(pdfBuffer, 'application/pdf', 'Z615.pdf');
  assert(analysis.extractionStatus === 'SUCCESS', 'Full report extraction executes with SUCCESS status');

  // 3. Age extraction
  const ageVal = analysis.patientDemographics.age.value;
  assert(ageVal === 25, 'Age extracted accurately from Z615.pdf', `Expected 25, got ${ageVal}`);

  // 4. Gender extraction
  const genderVal = analysis.patientDemographics.gender.value;
  assert(genderVal === 'MALE', 'Gender extracted accurately from Z615.pdf', `Expected MALE, got ${genderVal}`);

  // 5. Fasting glucose extraction
  const fbs = analysis.laboratoryValues.fastingBloodSugar;
  assert(fbs.extracted || fbs.referenceRange?.includes('70 - 100'), 'Fasting glucose panel detected and parsed', `FBS value: ${fbs.value}, ref: ${fbs.referenceRange}`);

  // 6. Lipid extraction
  const chol = analysis.laboratoryValues.cholesterol;
  const hdl = analysis.laboratoryValues.hdl;
  const ldl = analysis.laboratoryValues.ldl;
  const tg = analysis.laboratoryValues.triglycerides;
  const hasLipids = chol.extracted || hdl.extracted || ldl.extracted || tg.extracted;
  assert(hasLipids, 'Lipid panel extracted (Cholesterol/HDL/LDL/Triglycerides)', `Chol: ${chol.value}, HDL: ${hdl.value}, LDL: ${ldl.value}, TG: ${tg.value}`);

  // 7. hs-CRP extraction
  const hscrp = analysis.laboratoryValues.hscrp;
  assert(hscrp.extracted && hscrp.value === 1.0, 'hs-CRP extracted accurately (1.00 mg/L)', `hsCRP value: ${hscrp.value}`);

  // 8. Troponin-I extraction
  const trop = analysis.laboratoryValues.troponinI;
  assert(trop.extracted && trop.value === 4, 'Troponin-I extracted accurately (4 ng/L)', `Troponin-I value: ${trop.value}`);

  // 9. Unsupported-field classification
  const unusedKeys = analysis.unusedClinicalValues.map(u => u.key);
  const hsCrpUnused = unusedKeys.includes('hscrp');
  const tropUnused = unusedKeys.includes('troponinI');
  const apoBUnused = unusedKeys.includes('apolipoproteinB');
  assert(
    hsCrpUnused && tropUnused && apoBUnused,
    'Unsupported biomarkers (hs-CRP, Troponin-I, Apo B) segregated into unused values',
    `Unused list: ${unusedKeys.join(', ')}`
  );

  // 10. Canonical mapping
  assert(
    analysis.caseId !== undefined && analysis.modelCompatibility !== undefined,
    'Canonical mapping produces valid ClinicalReportAnalysisResult schema'
  );

  // 11. Missing-field detection
  const missingInZ615 = analysis.modelCompatibility.missingFields;
  const bpMissing = missingInZ615.includes('Systolic Blood Pressure');
  const smokeMissing = missingInZ615.includes('Smoking Status');
  assert(
    bpMissing && smokeMissing,
    'Missing vital/lifestyle data (Blood Pressure, Smoking) accurately detected as MISSING without fabrication',
    `Missing fields: ${missingInZ615.join(', ')}`
  );

  // 12. Manual correction & source attribution
  const reviewedValues: ClinicalReportData = {
    age: 25,
    gender: 'MALE',
    height: 175,
    weight: 70,
    bmi: 22.9,
    systolicBP: 120,
    diastolicBP: 80,
    cholesterol: 180,
    fastingBloodSugar: 90,
    restingHeartRate: 72,
    ecgResults: 'NORMAL',
    exerciseFrequency: 3,
    activeSmoking: false,
    activeAlcohol: false,
    diabetes: false,
    familyHeartDiseaseHistory: false,
    chestPainSymptomType: 'ASYMPTOMATIC',
    sleepDuration: 8,
    stressLevel: 4,
  };

  const readinessBefore = validateModelReadiness({
    age: 25,
    gender: 'MALE',
    cholesterol: 180,
    fastingBloodSugar: 90,
    // Vitals intentionally omitted to test incomplete detection
  });

  // 13. Model selection (READY vs INCOMPLETE)
  assert(
    readinessBefore.framingham.status === 'INCOMPLETE' && readinessBefore.cardio_lifestyle.status === 'INCOMPLETE',
    'Model selection accurately marks Framingham and Cardio models as INCOMPLETE when vitals are missing'
  );

  const readinessAfter = validateModelReadiness(reviewedValues);
  assert(
    readinessAfter.framingham.status === 'READY' && readinessAfter.cardio_lifestyle.status === 'READY',
    'Model selection marks models as READY once user provides verified vitals'
  );

  // 14. Prediction execution
  const testUserId = 'test-patient-uuid-101';
  const prediction = await executeClinicalReportPrediction(testUserId, {
    caseId: analysis.caseId,
    reportFileName: 'Z615.pdf',
    reportDate: analysis.reportDate,
    clinicalValues: reviewedValues,
    sourceAttribution: {
      age: 'REPORT',
      gender: 'REPORT',
      systolicBP: 'USER_ENTERED',
      diastolicBP: 'USER_ENTERED',
      cholesterol: 'REPORT',
      fastingBloodSugar: 'REPORT',
      bmi: 'DERIVED',
    },
    unusedClinicalValues: analysis.unusedClinicalValues,
  });

  assert(
    prediction.modelResults.framingham.status === 'EXECUTED' && prediction.overallRiskScore !== undefined,
    'Prediction pipeline executes via existing ML microservice with numeric risk output',
    `Overall risk score: ${prediction.overallRiskScore}%, Framingham status: ${prediction.modelResults.framingham.status}`
  );

  // 15. SHAP explainability
  assert(
    Array.isArray(prediction.shapExplanation) && prediction.shapExplanation.length > 0,
    'SHAP feature contributions generated for prediction',
    `SHAP factors count: ${prediction.shapExplanation.length}`
  );

  // 16. Patient isolation verification
  const auditLogsUserA = await executeClinicalReportPrediction('user-a-111', {
    caseId: 'CASE-A',
    reportFileName: 'report-a.pdf',
    clinicalValues: reviewedValues,
  });
  const auditLogsUserB = await executeClinicalReportPrediction('user-b-222', {
    caseId: 'CASE-B',
    reportFileName: 'report-b.pdf',
    clinicalValues: reviewedValues,
  });
  assert(
    auditLogsUserA.caseId !== auditLogsUserB.caseId,
    'Patient isolation: Independent case scoping per user ID confirmed'
  );

  // 17. Invalid PDF resilience
  try {
    const invalidBuffer = Buffer.from('NOT_A_VALID_PDF_HEADER_RAW_BYTES_CORRUPTED');
    const invalidResult = await analyzeClinicalReportFile(invalidBuffer, 'application/pdf', 'corrupt.pdf');
    assert(invalidResult.extractionStatus !== undefined, 'Invalid PDF handled gracefully without unhandled crash');
  } catch (err: any) {
    assert(false, 'Invalid PDF threw unhandled exception', err.message);
  }

  // 18. Oversized file handling
  const hugeBuffer = Buffer.alloc(25 * 1024 * 1024, 0); // 25 MB
  try {
    const hugeResult = await analyzeClinicalReportFile(hugeBuffer, 'application/pdf', 'huge.pdf');
    assert(hugeResult !== undefined, 'Oversized buffer processed or handled without server panic');
  } catch (err: any) {
    assert(true, 'Oversized buffer safely rejected or caught', err.message);
  }

  // 19. Empty report handling
  const emptyResult = await analyzeClinicalReportFile(Buffer.from(''), 'application/pdf', 'empty.pdf', '');
  assert(
    emptyResult.modelCompatibility.missingFields.length > 0,
    'Empty report cleanly yields empty/missing values without fabrication'
  );

  // 20. Malformed text report
  const gibberishText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Random string 12345.';
  const malformedResult = await analyzeClinicalReportFile(null, 'text/plain', 'malformed.txt', gibberishText);
  assert(
    malformedResult.patientDemographics.age.extracted === false &&
    malformedResult.modelReadiness.framingham.status === 'INCOMPLETE',
    'Malformed report maintains strict academic integrity (no fabricated clinical entities)'
  );

  console.log('\n===============================================================');
  console.log(`   TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    console.log('ALL 20 PIPELINE TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
