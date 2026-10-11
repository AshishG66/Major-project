export type ValueSource = 'REPORT' | 'DERIVED' | 'USER_ENTERED' | 'MISSING';

export interface ExtractedFieldMetadata<T> {
  value: T | null;
  source: ValueSource;
  confidence: number;
  extracted: boolean;
  unit?: string;
  referenceRange?: string;
  sourceSnippet?: string;
  isCompatibleWithModels: boolean;
  note?: string;
}

export interface UnusedClinicalValue {
  key: string;
  displayName: string;
  value: number | string | null;
  unit?: string;
  referenceRange?: string;
  category: 'ADVANCED_CARDIAC_BIOMARKER' | 'LIPID_SUBFRACTION' | 'GLYCEMIC_MARKER' | 'INFLAMMATORY_MARKER';
  clinicalSignificance: string;
  statusNotice: string;
  sourceSnippet?: string;
}

export type ModelId = 'framingham' | 'cardio_lifestyle' | 'heart_failure' | 'stroke' | 'ecg_arrhythmia';

export interface ModelReadinessInfo {
  modelId: ModelId;
  modelName: string;
  status: 'READY' | 'INCOMPLETE';
  requiredFields: string[];
  availableFields: string[];
  missingFields: string[];
  reason?: string;
}

export interface DocumentedOutcome {
  eventType: string;
  outcomeDate?: string;
  outcomeSource?: string;
  eventDescription?: string;
  eventDetectedInReport: boolean;
}

export interface ClinicalReportAnalysisResult {
  caseId: string;
  reportFileName: string;
  reportDate?: string;
  extractionStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  patientDemographics: {
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
  modelCompatibility: {
    compatibleFields: string[];
    derivableFields: string[];
    unusedFields: string[];
    missingFields: string[];
  };
  modelReadiness: Record<ModelId, ModelReadinessInfo>;
  unusedClinicalValues: UnusedClinicalValue[];
  documentedOutcome: DocumentedOutcome;
  rawTextSummary: string;
}

export interface SingleModelPredictionOutput {
  modelId: ModelId;
  modelName: string;
  status: 'EXECUTED' | 'UNAVAILABLE';
  riskScore?: number;
  riskLevel?: string;
  probability?: number;
  confidence?: number;
  outputDetails?: Record<string, any>;
  reasonIfUnavailable?: string;
}

export interface ClinicalReportPredictionResult {
  id?: string;
  caseId: string;
  reportSource: string;
  reportDate?: string;
  overallRiskScore?: number;
  overallRiskLevel?: string;
  modelResults: Record<ModelId, SingleModelPredictionOutput>;
  shapExplanation: Array<{
    feature: string;
    value: string | number;
    importance: number;
    impact: string;
    direction?: string;
  }>;
  sourceDataAttribution: Record<string, {
    value: any;
    source: ValueSource;
    displaySource: string;
  }>;
  unusedClinicalValues: UnusedClinicalValue[];
  digitalTwinMetrics?: {
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    pumpingEfficiency?: number;
    vascularAge?: number;
    ecgStatus?: string;
  };
  preventionPlan?: any;
  recommendations?: any;
  createdAt: string;
}
