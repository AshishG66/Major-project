/**
 * Smart Weight Recommendation & Clinical BMI Utility
 *
 * Implements clinical reference calculations for the HridayaDarpana Cardiac Platform:
 * - Reference weight range for adults (BMI 18.5 – 24.9 kg/m²)
 * - Real-time BMI calculation & clinical categorization
 * - Pediatric differentiation (<18 years requires age- and sex-specific growth percentiles)
 * - Input validation & physiological bounds checking
 */

export type WeightStatus = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface WeightStatusInfo {
  status: WeightStatus;
  label: string;
  description: string;
  color: string;
  bgLight: string;
  badgeBorder: string;
}

export interface SmartWeightInput {
  age?: number | string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string | null;
  height?: number | string | null;
  weight?: number | string | null;
}

export interface SmartWeightRecommendationResult {
  status: 'missing_input' | 'invalid_input' | 'pediatric' | 'adult';
  isPediatric: boolean;
  hasRecommendation: boolean;
  message: string;
  minWeight?: number;
  maxWeight?: number;
  midpointWeight?: number;
  bmi?: number;
  weightStatus?: WeightStatusInfo;
  genderContext?: string;
  explanation: string;
}

export const ADULT_BMI_MIN = 18.5;
export const ADULT_BMI_MAX = 24.9;
export const MIN_PHYSIOLOGICAL_HEIGHT_CM = 50;
export const MAX_PHYSIOLOGICAL_HEIGHT_CM = 250;
export const MIN_PHYSIOLOGICAL_AGE = 1;
export const MAX_PHYSIOLOGICAL_AGE = 120;
export const ADULT_AGE_THRESHOLD = 18;

/**
 * Parses numeric inputs safely, returning null if invalid or NaN.
 */
export function parseNumericValue(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : null;
}

/**
 * Calculates BMI from weight (kg) and height (cm).
 * Formula: weight (kg) / [height (m)]^2
 */
export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return parseFloat(bmi.toFixed(1));
}

/**
 * Maps an adult BMI to clinical weight status categorization.
 */
export function getWeightStatus(bmi: number): WeightStatusInfo {
  if (bmi < 18.5) {
    return {
      status: 'underweight',
      label: 'Underweight',
      description: 'Below standard reference range (< 18.5 kg/m²). Nutritional assessment recommended.',
      color: '#0284c7', // Sky-600
      bgLight: '#f0f9ff',
      badgeBorder: '#bae6fd',
    };
  }
  if (bmi <= 24.9) {
    return {
      status: 'normal',
      label: 'Healthy Weight',
      description: 'Within optimal clinical cardiovascular reference range (18.5 – 24.9 kg/m²).',
      color: '#059669', // Emerald-600
      bgLight: '#ecfdf5',
      badgeBorder: '#a7f3d0',
    };
  }
  if (bmi <= 29.9) {
    return {
      status: 'overweight',
      label: 'Overweight',
      description: 'Above optimal reference range (25.0 – 29.9 kg/m²). Elevated cardiovascular strain.',
      color: '#d97706', // Amber-600
      bgLight: '#fffbeb',
      badgeBorder: '#fde68a',
    };
  }
  return {
    status: 'obese',
    label: 'Obese (High Risk)',
    description: 'Significantly elevated cardiometabolic risk (≥ 30.0 kg/m²). Clinical intervention advised.',
    color: '#dc2626', // Red-600
    bgLight: '#fef2f2',
    badgeBorder: '#fecaca',
  };
}

/**
 * Calculates the reference weight range for a given height in cm.
 * Minimum = 18.5 * (height in m)^2
 * Maximum = 24.9 * (height in m)^2
 */
export function calculateReferenceWeightRange(heightCm: number): {
  minWeight: number;
  maxWeight: number;
  midpointWeight: number;
} | null {
  if (heightCm < MIN_PHYSIOLOGICAL_HEIGHT_CM || heightCm > MAX_PHYSIOLOGICAL_HEIGHT_CM) {
    return null;
  }
  const heightM = heightCm / 100;
  const h2 = heightM * heightM;
  const rawMin = ADULT_BMI_MIN * h2;
  const rawMax = ADULT_BMI_MAX * h2;
  const minWeight = parseFloat(rawMin.toFixed(1));
  const maxWeight = parseFloat(rawMax.toFixed(1));
  const midpointWeight = parseFloat(((rawMin + rawMax) / 2).toFixed(1));

  return { minWeight, maxWeight, midpointWeight };
}

/**
 * Evaluates gender context description.
 * Note: Clinical thresholds remain uniform, but patient gender is acknowledged.
 */
export function formatGenderContext(gender?: string | null): string {
  if (!gender) return 'Adult Clinical Reference';
  const norm = String(gender).toUpperCase();
  if (norm === 'MALE') return 'Adult Male Clinical Reference';
  if (norm === 'FEMALE') return 'Adult Female Clinical Reference';
  return 'Adult Clinical Reference';
}

/**
 * Main coordinator: computes Smart Weight Recommendation & BMI Analysis based on current inputs.
 */
export function getSmartWeightRecommendation(input: SmartWeightInput): SmartWeightRecommendationResult {
  const age = parseNumericValue(input.age);
  const height = parseNumericValue(input.height);
  const weight = parseNumericValue(input.weight);
  const genderContext = formatGenderContext(input.gender);

  // Case 1: Missing primary inputs
  if (age === null && height === null) {
    return {
      status: 'missing_input',
      isPediatric: false,
      hasRecommendation: false,
      message: 'Enter age and height to view reference weight recommendations.',
      genderContext,
      explanation: 'Calculated using standard clinical BMI reference bounds (18.5–24.9 kg/m²) for adults.',
    };
  }

  if (age === null) {
    return {
      status: 'missing_input',
      isPediatric: false,
      hasRecommendation: false,
      message: 'Enter patient age to verify adult reference criteria.',
      genderContext,
      explanation: 'Age verification is required to determine whether adult reference or pediatric growth percentiles apply.',
    };
  }

  if (height === null) {
    return {
      status: 'missing_input',
      isPediatric: false,
      hasRecommendation: false,
      message: 'Enter patient height (cm) to calculate reference weight range.',
      genderContext,
      explanation: 'Height is required to compute reference weight bounds via standard BMI proportionality.',
    };
  }

  // Case 2: Invalid physiological bounds
  if (age < MIN_PHYSIOLOGICAL_AGE || age > MAX_PHYSIOLOGICAL_AGE) {
    return {
      status: 'invalid_input',
      isPediatric: false,
      hasRecommendation: false,
      message: `Age must be between ${MIN_PHYSIOLOGICAL_AGE} and ${MAX_PHYSIOLOGICAL_AGE} years.`,
      genderContext,
      explanation: 'Please provide a valid physiological age.',
    };
  }

  if (height < MIN_PHYSIOLOGICAL_HEIGHT_CM || height > MAX_PHYSIOLOGICAL_HEIGHT_CM) {
    return {
      status: 'invalid_input',
      isPediatric: false,
      hasRecommendation: false,
      message: `Height must be between ${MIN_PHYSIOLOGICAL_HEIGHT_CM} cm and ${MAX_PHYSIOLOGICAL_HEIGHT_CM} cm.`,
      genderContext,
      explanation: 'Please provide a valid physiological height for clinical estimation.',
    };
  }

  // Optional: check if weight is provided but invalid
  const hasWeight = weight !== null && weight > 0;
  let currentBmi: number | undefined;
  let currentWeightStatus: WeightStatusInfo | undefined;

  if (hasWeight) {
    const calcBmi = calculateBMI(weight, height);
    if (calcBmi !== null) {
      currentBmi = calcBmi;
      currentWeightStatus = getWeightStatus(calcBmi);
    }
  }

  // Case 3: Pediatric patient (< 18)
  if (age < ADULT_AGE_THRESHOLD) {
    return {
      status: 'pediatric',
      isPediatric: true,
      hasRecommendation: false,
      message: `Patient is under 18 (age ${age}). Adult reference ranges do not apply. An age- and sex-specific BMI-for-age reference (WHO/CDC growth percentiles) is clinically required.`,
      bmi: currentBmi,
      genderContext: `${genderContext.replace('Adult', 'Pediatric')}`,
      explanation:
        'Standard adult BMI bounds (18.5–24.9 kg/m²) cannot be used for patients under 18 years. Clinical pediatric guidelines mandate using age- and sex-specific growth charts.',
    };
  }

  // Case 4: Adult patient (>= 18)
  const range = calculateReferenceWeightRange(height);
  if (!range) {
    return {
      status: 'invalid_input',
      isPediatric: false,
      hasRecommendation: false,
      message: 'Unable to calculate reference range with the provided height.',
      genderContext,
      explanation: 'Height value could not be resolved.',
    };
  }

  return {
    status: 'adult',
    isPediatric: false,
    hasRecommendation: true,
    message: `Reference healthy weight range: ${range.minWeight}–${range.maxWeight} kg`,
    minWeight: range.minWeight,
    maxWeight: range.maxWeight,
    midpointWeight: range.midpointWeight,
    bmi: currentBmi,
    weightStatus: currentWeightStatus,
    genderContext,
    explanation: `Calculated as [18.5 to 24.9 kg/m²] × (height in meters)². Standard clinical adult BMI cutoff points remain universal across genders.`,
  };
}
