import { ClinicalReportData, ModelId, ModelReadinessInfo } from '../types.js';

export interface ModelFeatureRequirement {
  id: ModelId;
  name: string;
  domain: string;
  requiredFields: Array<{
    key: keyof ClinicalReportData;
    displayName: string;
    description: string;
  }>;
  alternativeRequirementGroups?: Array<Array<keyof ClinicalReportData>>;
}

export const MODEL_REQUIREMENTS: Record<ModelId, ModelFeatureRequirement> = {
  framingham: {
    id: 'framingham',
    name: 'Framingham 10-Year Cardiovascular Disease Risk Model',
    domain: 'Framingham Heart Study (Ambulatory CHD)',
    requiredFields: [
      { key: 'age', displayName: 'Age', description: 'Patient chronological age in years' },
      { key: 'gender', displayName: 'Gender', description: 'Biological sex (Male/Female)' },
      { key: 'systolicBP', displayName: 'Systolic Blood Pressure', description: 'Systolic blood pressure in mmHg' },
      { key: 'diastolicBP', displayName: 'Diastolic Blood Pressure', description: 'Diastolic blood pressure in mmHg' },
      { key: 'cholesterol', displayName: 'Total Cholesterol', description: 'Serum total cholesterol in mg/dL' },
      { key: 'fastingBloodSugar', displayName: 'Fasting Blood Sugar', description: 'Fasting blood glucose in mg/dL' },
      { key: 'activeSmoking', displayName: 'Smoking Status', description: 'Current tobacco smoking status' },
      { key: 'diabetes', displayName: 'Diabetes Status', description: 'Clinical diabetes mellitus diagnosis' },
      { key: 'restingHeartRate', displayName: 'Resting Heart Rate', description: 'Resting heart rate in beats per minute' },
      { key: 'bmi', displayName: 'Body Mass Index (BMI)', description: 'BMI in kg/m² (or derivable from height and weight)' },
    ],
  },

  cardio_lifestyle: {
    id: 'cardio_lifestyle',
    name: 'Cardiovascular Lifestyle & Biometric Risk Model',
    domain: 'Kaggle Cardiovascular Disease Dataset (CatBoost)',
    requiredFields: [
      { key: 'age', displayName: 'Age', description: 'Patient chronological age in years' },
      { key: 'gender', displayName: 'Gender', description: 'Biological sex (Male/Female)' },
      { key: 'height', displayName: 'Height', description: 'Height in centimeters' },
      { key: 'weight', displayName: 'Weight', description: 'Weight in kilograms' },
      { key: 'systolicBP', displayName: 'Systolic Blood Pressure', description: 'Systolic blood pressure in mmHg' },
      { key: 'diastolicBP', displayName: 'Diastolic Blood Pressure', description: 'Diastolic blood pressure in mmHg' },
      { key: 'cholesterol', displayName: 'Total Cholesterol', description: 'Total cholesterol tier in mg/dL' },
      { key: 'fastingBloodSugar', displayName: 'Fasting Blood Sugar', description: 'Glucose tier in mg/dL' },
      { key: 'activeSmoking', displayName: 'Smoking Status', description: 'Current tobacco smoking status' },
      { key: 'activeAlcohol', displayName: 'Alcohol Intake', description: 'Alcohol consumption habit' },
      { key: 'exerciseFrequency', displayName: 'Exercise Frequency', description: 'Physical activity days per week' },
    ],
  },

  heart_failure: {
    id: 'heart_failure',
    name: 'Heart Failure Clinical Records & Mortality Model',
    domain: 'Heart Failure Clinical Records (XGBoost)',
    requiredFields: [
      { key: 'age', displayName: 'Age', description: 'Patient chronological age in years' },
      { key: 'gender', displayName: 'Gender', description: 'Biological sex (Male/Female)' },
      { key: 'systolicBP', displayName: 'Systolic Blood Pressure', description: 'Systolic blood pressure in mmHg' },
      { key: 'diabetes', displayName: 'Diabetes Status', description: 'Diabetes mellitus diagnosis' },
      { key: 'activeSmoking', displayName: 'Smoking Status', description: 'Tobacco smoking history' },
    ],
  },

  stroke: {
    id: 'stroke',
    name: 'Stroke Risk & Cerebrovascular Health Model',
    domain: 'Stroke Prediction Dataset (Gradient Boosting)',
    requiredFields: [
      { key: 'age', displayName: 'Age', description: 'Patient chronological age in years' },
      { key: 'gender', displayName: 'Gender', description: 'Biological sex (Male/Female)' },
      { key: 'systolicBP', displayName: 'Systolic Blood Pressure', description: 'Systolic blood pressure (hypertension risk)' },
      { key: 'fastingBloodSugar', displayName: 'Fasting Blood Sugar', description: 'Average glucose level in mg/dL' },
      { key: 'bmi', displayName: 'Body Mass Index (BMI)', description: 'BMI in kg/m²' },
      { key: 'activeSmoking', displayName: 'Smoking Status', description: 'Current or former smoking status' },
    ],
  },

  ecg_arrhythmia: {
    id: 'ecg_arrhythmia',
    name: 'PhysioNet ECG Arrhythmia Feature Model',
    domain: 'PhysioNet ECG Feature Dataset (Random Forest)',
    requiredFields: [
      { key: 'restingHeartRate', displayName: 'Resting Heart Rate', description: 'Resting heart rate in bpm (derives R-R interval)' },
      { key: 'ecgResults', displayName: 'ECG Findings', description: 'Resting 12-lead ECG waveform evaluation' },
    ],
  },
};

/**
 * Validates available clinical report data against each model's required inputs.
 * Strictly avoids fabricating missing clinical inputs.
 * Accurately determines READY vs INCOMPLETE.
 */
export function validateModelReadiness(data: ClinicalReportData): Record<ModelId, ModelReadinessInfo> {
  const result: Partial<Record<ModelId, ModelReadinessInfo>> = {};

  const modelIds: ModelId[] = ['framingham', 'cardio_lifestyle', 'heart_failure', 'stroke', 'ecg_arrhythmia'];

  for (const id of modelIds) {
    const config = MODEL_REQUIREMENTS[id];
    const available: string[] = [];
    const missing: string[] = [];

    for (const req of config.requiredFields) {
      let isPresent = false;

      // Special check: BMI is satisfied if BMI is present OR if both height and weight are present
      if (req.key === 'bmi') {
        if (data.bmi !== undefined && data.bmi !== null) {
          isPresent = true;
        } else if (
          data.height !== undefined && data.height !== null &&
          data.weight !== undefined && data.weight !== null
        ) {
          isPresent = true;
        }
      } else {
        const val = data[req.key];
        if (val !== undefined && val !== null) {
          isPresent = true;
        }
      }

      if (isPresent) {
        available.push(req.displayName);
      } else {
        missing.push(req.displayName);
      }
    }

    const isReady = missing.length === 0;

    result[id] = {
      modelId: id,
      modelName: config.name,
      status: isReady ? 'READY' : 'INCOMPLETE',
      requiredFields: config.requiredFields.map(f => f.displayName),
      availableFields: available,
      missingFields: missing,
      reason: isReady
        ? undefined
        : `Model unavailable for this report because required clinical inputs are missing: ${missing.join(', ')}.`,
    };
  }

  return result as Record<ModelId, ModelReadinessInfo>;
}
