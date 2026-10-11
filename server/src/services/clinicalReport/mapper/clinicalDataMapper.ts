import {
  ClinicalReportData,
  ExtractedFieldMetadata,
  UnusedClinicalValue,
  ValueSource
} from '../types.js';
import { RawExtractedEntities } from '../extractor/documentExtractor.js';

export interface MappedClinicalResult {
  canonicalData: ClinicalReportData;
  demographics: {
    age: ExtractedFieldMetadata<number>;
    gender: ExtractedFieldMetadata<'MALE' | 'FEMALE' | 'OTHER'>;
  };
  laboratoryValues: {
    fastingBloodSugar: ExtractedFieldMetadata<number>;
    cholesterol: ExtractedFieldMetadata<number>;
    hdl: ExtractedFieldMetadata<number>;
    ldl: ExtractedFieldMetadata<number>;
    triglycerides: ExtractedFieldMetadata<number>;
    vldl: ExtractedFieldMetadata<number>;
    nonHdlCholesterol: ExtractedFieldMetadata<number>;
    hscrp: ExtractedFieldMetadata<number>;
    troponinI: ExtractedFieldMetadata<number>;
    apolipoproteinB: ExtractedFieldMetadata<number>;
    lpa: ExtractedFieldMetadata<number>;
    hba1c: ExtractedFieldMetadata<number>;
  };
  vitalsAndLifestyle: {
    systolicBP: ExtractedFieldMetadata<number>;
    diastolicBP: ExtractedFieldMetadata<number>;
    height: ExtractedFieldMetadata<number>;
    weight: ExtractedFieldMetadata<number>;
    bmi: ExtractedFieldMetadata<number>;
    restingHeartRate: ExtractedFieldMetadata<number>;
    ecgResults: ExtractedFieldMetadata<'NORMAL' | 'ST_T_ABNORMAL' | 'LV_HYPERTROPHY'>;
    exerciseFrequency: ExtractedFieldMetadata<number>;
    smoking: ExtractedFieldMetadata<boolean>;
    alcohol: ExtractedFieldMetadata<boolean>;
    diabetes: ExtractedFieldMetadata<boolean>;
    familyHistory: ExtractedFieldMetadata<boolean>;
    chestPainType: ExtractedFieldMetadata<'TYPICAL' | 'ATYPICAL' | 'NON_ANGINAL' | 'ASYMPTOMATIC'>;
    sleepDuration: ExtractedFieldMetadata<number>;
    stressLevel: ExtractedFieldMetadata<number>;
  };
  directlySupportedFeatures: string[];
  derivableFeatures: string[];
  unusedClinicalInformation: UnusedClinicalValue[];
  missingRequiredFeatures: string[];
}

/**
 * Maps raw extracted entities into normalized canonical representations.
 * Strictly segregates:
 * 1. Directly supported model features
 * 2. Derivable features
 * 3. Extracted clinical values not currently used by tabular ML models
 * 4. Missing required features
 */
export function mapRawEntitiesToCanonical(raw: RawExtractedEntities): MappedClinicalResult {
  const directlySupported: string[] = [];
  const derivable: string[] = [];
  const unused: UnusedClinicalValue[] = [];
  const missing: string[] = [];

  // Helper to construct field metadata
  const makeField = <T>(
    extractedObj: { value: T; confidence?: number; snippet?: string; unit?: string; referenceRange?: string } | undefined,
    defaultSource: ValueSource,
    isCompatible: boolean,
    fieldName: string,
    unit?: string,
    refRange?: string,
    customNote?: string
  ): ExtractedFieldMetadata<T> => {
    if (extractedObj && extractedObj.value !== undefined && extractedObj.value !== null) {
      if (isCompatible) {
        if (defaultSource === 'DERIVED') derivable.push(fieldName);
        else directlySupported.push(fieldName);
      }
      return {
        value: extractedObj.value,
        source: defaultSource,
        confidence: extractedObj.confidence ?? 95,
        extracted: true,
        unit: extractedObj.unit || unit,
        referenceRange: extractedObj.referenceRange || refRange,
        sourceSnippet: extractedObj.snippet,
        isCompatibleWithModels: isCompatible,
        note: customNote,
      };
    }

    missing.push(fieldName);
    return {
      value: null,
      source: 'MISSING',
      confidence: 0,
      extracted: false,
      unit,
      referenceRange: refRange,
      isCompatibleWithModels: isCompatible,
      note: 'Not found in document. User review/entry required.',
    };
  };

  // 1. Demographics
  const age = makeField<number>(raw.age, 'REPORT', true, 'Age', 'Years');
  const gender = makeField<'MALE' | 'FEMALE' | 'OTHER'>(raw.gender, 'REPORT', true, 'Gender');

  // 2. Primary Laboratory Values
  const cholesterol = makeField<number>(
    raw.cholesterol,
    'REPORT',
    true,
    'Total Serum Cholesterol',
    'mg/dL',
    '< 200 mg/dL',
    raw.cholesterol?.confidence && raw.cholesterol.confidence < 80
      ? 'Extracted from laboratory reference interval or panel. User verification recommended.'
      : undefined
  );

  const fastingBloodSugar = makeField<number>(
    raw.fastingBloodSugar,
    'REPORT',
    true,
    'Fasting Blood Sugar',
    'mg/dL',
    '70 - 100 mg/dL'
  );

  // 3. Lipid Subfractions (Extracted but NOT directly accepted by baseline models)
  // Models in HridayaDarpana use Total Cholesterol (totChol, ap_hi/ap_lo, cholesterol index).
  // Subfractions must NEVER be silently substituted for Total Cholesterol.
  const hdl = makeField<number>(raw.hdl, 'REPORT', false, 'HDL Cholesterol', 'mg/dL', '> 40 mg/dL');
  const ldl = makeField<number>(raw.ldl, 'REPORT', false, 'LDL Cholesterol', 'mg/dL', '< 100 mg/dL');
  const triglycerides = makeField<number>(raw.triglycerides, 'REPORT', false, 'Triglycerides', 'mg/dL', '< 150 mg/dL');
  const vldl = makeField<number>(raw.vldl, 'REPORT', false, 'VLDL Cholesterol', 'mg/dL', '< 30 mg/dL');
  const nonHdlCholesterol = makeField<number>(raw.nonHdlCholesterol, 'REPORT', false, 'Non-HDL Cholesterol', 'mg/dL', '< 130 mg/dL');

  // 4. Advanced Cardiac Biomarkers (Extracted but NOT used by baseline models)
  const hscrp = makeField<number>(raw.hscrp, 'REPORT', false, 'High-Sensitivity C-Reactive Protein (hs-CRP)', 'mg/L', '< 1.00 mg/L');
  const troponinI = makeField<number>(raw.troponinI, 'REPORT', false, 'High-Sensitivity Troponin-I (hsTnI)', 'ng/L', '< 6 ng/L (Male)');
  const apolipoproteinB = makeField<number>(raw.apolipoproteinB, 'REPORT', false, 'Apolipoprotein B (Apo B)', 'mg/dL', '46 - 174 mg/dL');
  const lpa = makeField<number>(raw.lpa, 'REPORT', false, 'Lipoprotein(a) [Lp(a)]', 'mg/dL', '< 20 mg/dL');
  const hba1c = makeField<number>(raw.hba1c, 'REPORT', false, 'Glycosylated Hemoglobin (HbA1c)', '%', '4.00 - 5.60%');

  // 5. Populate Unused Clinical Values array
  if (hscrp.extracted && hscrp.value !== null) {
    unused.push({
      key: 'hscrp',
      displayName: 'High-Sensitivity C-Reactive Protein (hs-CRP)',
      value: hscrp.value,
      unit: 'mg/L',
      referenceRange: hscrp.referenceRange,
      category: 'INFLAMMATORY_MARKER',
      clinicalSignificance: 'Independent vascular inflammatory marker that improves long-term cardiovascular risk stratification. Current ML baseline models utilize classic Framingham & lifestyle features.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: hscrp.sourceSnippet,
    });
  }

  if (troponinI.extracted && troponinI.value !== null) {
    unused.push({
      key: 'troponinI',
      displayName: 'High-Sensitivity Troponin-I (hsTnI)',
      value: troponinI.value,
      unit: 'ng/L',
      referenceRange: troponinI.referenceRange,
      category: 'ADVANCED_CARDIAC_BIOMARKER',
      clinicalSignificance: 'Gold-standard biomarker for subclinical myocardial micro-injury and acute coronary evaluation. Evaluated separately from chronic ambulatory risk scores.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: troponinI.sourceSnippet,
    });
  }

  if (apolipoproteinB.extracted && apolipoproteinB.value !== null) {
    unused.push({
      key: 'apolipoproteinB',
      displayName: 'Apolipoprotein B (Apo B)',
      value: apolipoproteinB.value,
      unit: 'mg/dL',
      referenceRange: apolipoproteinB.referenceRange,
      category: 'ADVANCED_CARDIAC_BIOMARKER',
      clinicalSignificance: 'Direct measure of circulating atherogenic particle count (LDL, IDL, VLDL particles). Retained for lipidologist review rather than forcing into standard total cholesterol feature.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: apolipoproteinB.sourceSnippet,
    });
  }

  if (lpa.extracted && lpa.value !== null) {
    unused.push({
      key: 'lpa',
      displayName: 'Lipoprotein(a) [Lp(a)]',
      value: lpa.value,
      unit: 'mg/dL',
      referenceRange: lpa.referenceRange,
      category: 'ADVANCED_CARDIAC_BIOMARKER',
      clinicalSignificance: 'Genetically determined independent causal risk factor for premature atherosclerotic cardiovascular disease and aortic stenosis.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: lpa.sourceSnippet,
    });
  }

  if (ldl.extracted && ldl.value !== null) {
    unused.push({
      key: 'ldl',
      displayName: 'LDL Cholesterol',
      value: ldl.value,
      unit: 'mg/dL',
      referenceRange: ldl.referenceRange,
      category: 'LIPID_SUBFRACTION',
      clinicalSignificance: 'Primary target of lipid-lowering therapy. System models use total cholesterol index; LDL is explicitly preserved without substitution.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: ldl.sourceSnippet,
    });
  }

  if (hdl.extracted && hdl.value !== null) {
    unused.push({
      key: 'hdl',
      displayName: 'HDL Cholesterol',
      value: hdl.value,
      unit: 'mg/dL',
      referenceRange: hdl.referenceRange,
      category: 'LIPID_SUBFRACTION',
      clinicalSignificance: 'Anti-atherogenic reverse cholesterol transport metric.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: hdl.sourceSnippet,
    });
  }

  if (triglycerides.extracted && triglycerides.value !== null) {
    unused.push({
      key: 'triglycerides',
      displayName: 'Triglycerides',
      value: triglycerides.value,
      unit: 'mg/dL',
      referenceRange: triglycerides.referenceRange,
      category: 'LIPID_SUBFRACTION',
      clinicalSignificance: 'Triglyceride-rich lipoprotein marker associated with metabolic syndrome.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: triglycerides.sourceSnippet,
    });
  }

  if (vldl.extracted && vldl.value !== null) {
    unused.push({
      key: 'vldl',
      displayName: 'VLDL Cholesterol',
      value: vldl.value,
      unit: 'mg/dL',
      referenceRange: vldl.referenceRange,
      category: 'LIPID_SUBFRACTION',
      clinicalSignificance: 'Very-low-density lipoprotein remnant cholesterol indicator.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: vldl.sourceSnippet,
    });
  }

  if (nonHdlCholesterol.extracted && nonHdlCholesterol.value !== null) {
    unused.push({
      key: 'nonHdlCholesterol',
      displayName: 'Non-HDL Cholesterol',
      value: nonHdlCholesterol.value,
      unit: 'mg/dL',
      referenceRange: nonHdlCholesterol.referenceRange,
      category: 'LIPID_SUBFRACTION',
      clinicalSignificance: 'Calculated composite of all atherogenic apolipoprotein B-containing lipoproteins (Total Chol - HDL).',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: nonHdlCholesterol.sourceSnippet,
    });
  }

  if (hba1c.extracted && hba1c.value !== null) {
    unused.push({
      key: 'hba1c',
      displayName: 'HbA1c (Glycosylated Hemoglobin)',
      value: hba1c.value,
      unit: '%',
      referenceRange: hba1c.referenceRange,
      category: 'GLYCEMIC_MARKER',
      clinicalSignificance: 'Reflects 3-month average glycemic control. Fasting plasma glucose is used directly by current risk formulas.',
      statusNotice: 'Extracted — not currently used by prediction model',
      sourceSnippet: hba1c.sourceSnippet,
    });
  }

  // 6. Vitals & Anthropometrics
  const systolicBP = makeField<number>(raw.systolicBP, 'REPORT', true, 'Systolic Blood Pressure', 'mmHg');
  const diastolicBP = makeField<number>(raw.diastolicBP, 'REPORT', true, 'Diastolic Blood Pressure', 'mmHg');
  const height = makeField<number>(raw.height, 'REPORT', true, 'Height', 'cm');
  const weight = makeField<number>(raw.weight, 'REPORT', true, 'Weight', 'kg');

  // BMI: Derivable from height & weight
  let bmi: ExtractedFieldMetadata<number>;
  if (raw.bmi?.value) {
    bmi = makeField<number>(raw.bmi, raw.bmi.snippet?.includes('Derived') ? 'DERIVED' : 'REPORT', true, 'Body Mass Index (BMI)', 'kg/m²');
  } else if (height.extracted && weight.extracted && height.value && weight.value) {
    const calcBmi = parseFloat((weight.value / ((height.value / 100) ** 2)).toFixed(1));
    bmi = {
      value: calcBmi,
      source: 'DERIVED',
      confidence: 99,
      extracted: true,
      unit: 'kg/m²',
      isCompatibleWithModels: true,
      sourceSnippet: `Derived from ${height.value} cm & ${weight.value} kg`,
      note: 'Calculated from extracted height and weight.',
    };
    derivable.push('Body Mass Index (BMI)');
  } else {
    bmi = {
      value: null,
      source: 'MISSING',
      confidence: 0,
      extracted: false,
      unit: 'kg/m²',
      isCompatibleWithModels: true,
      note: 'Requires height and weight or direct BMI.',
    };
    missing.push('Body Mass Index (BMI)');
  }

  const restingHeartRate = makeField<number>(raw.restingHeartRate, 'REPORT', true, 'Resting Heart Rate', 'bpm');
  const ecgResults = makeField<'NORMAL' | 'ST_T_ABNORMAL' | 'LV_HYPERTROPHY'>(raw.ecgResults, 'REPORT', true, 'ECG Findings');
  const exerciseFrequency = makeField<number>(raw.exerciseFrequency, 'REPORT', true, 'Exercise Frequency', 'Days/week');
  const smoking = makeField<boolean>(raw.smoking, 'REPORT', true, 'Smoking Status');
  const alcohol = makeField<boolean>(raw.alcohol, 'REPORT', true, 'Alcohol Intake');
  const diabetes = makeField<boolean>(raw.diabetes, 'REPORT', true, 'Diabetes Status');
  const familyHistory = makeField<boolean>(raw.familyHistory, 'REPORT', true, 'Family Cardiac History');
  const chestPainType = makeField<'TYPICAL' | 'ATYPICAL' | 'NON_ANGINAL' | 'ASYMPTOMATIC'>(raw.chestPainType, 'REPORT', true, 'Chest Pain Symptoms');
  const sleepDuration = makeField<number>(raw.sleepDuration, 'REPORT', true, 'Sleep Duration', 'Hours/night');
  const stressLevel = makeField<number>(raw.stressLevel, 'REPORT', true, 'Stress Level', 'Scale 1-10');

  // Build canonical ClinicalReportData
  const canonicalData: ClinicalReportData = {
    age: age.value,
    gender: gender.value,
    height: height.value,
    weight: weight.value,
    bmi: bmi.value,
    systolicBP: systolicBP.value,
    diastolicBP: diastolicBP.value,
    restingHeartRate: restingHeartRate.value,
    cholesterol: cholesterol.value,
    fastingBloodSugar: fastingBloodSugar.value,
    ecgResults: ecgResults.value,
    exerciseFrequency: exerciseFrequency.value,
    chestPainSymptomType: chestPainType.value,
    sleepDuration: sleepDuration.value,
    stressLevel: stressLevel.value,
    activeSmoking: smoking.value,
    activeAlcohol: alcohol.value,
    diabetes: diabetes.value,
    familyHeartDiseaseHistory: familyHistory.value,
    hscrp: hscrp.value,
    troponinI: troponinI.value,
    apolipoproteinB: apolipoproteinB.value,
    ldl: ldl.value,
    hdl: hdl.value,
    triglycerides: triglycerides.value,
    vldl: vldl.value,
    nonHdlCholesterol: nonHdlCholesterol.value,
    lpa: lpa.value,
    hba1c: hba1c.value,
  };

  return {
    canonicalData,
    demographics: { age, gender },
    laboratoryValues: {
      fastingBloodSugar,
      cholesterol,
      hdl,
      ldl,
      triglycerides,
      vldl,
      nonHdlCholesterol,
      hscrp,
      troponinI,
      apolipoproteinB,
      lpa,
      hba1c,
    },
    vitalsAndLifestyle: {
      systolicBP,
      diastolicBP,
      height,
      weight,
      bmi,
      restingHeartRate,
      ecgResults,
      exerciseFrequency,
      smoking,
      alcohol,
      diabetes,
      familyHistory,
      chestPainType,
      sleepDuration,
      stressLevel,
    },
    directlySupportedFeatures: directlySupported,
    derivableFeatures: derivable,
    unusedClinicalInformation: unused,
    missingRequiredFeatures: missing,
  };
}
