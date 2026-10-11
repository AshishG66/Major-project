import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBMI,
  calculateReferenceWeightRange,
  getWeightStatus,
  getSmartWeightRecommendation,
  formatGenderContext,
  parseNumericValue,
} from './weightRecommendation';

describe('Smart Weight Recommendation & Clinical BMI Utility', () => {
  describe('Input parsing and sanitation', () => {
    it('parses valid numbers and numeric strings correctly', () => {
      assert.equal(parseNumericValue(45), 45);
      assert.equal(parseNumericValue('180'), 180);
      assert.equal(parseNumericValue('72.5'), 72.5);
    });

    it('returns null for empty or non-numeric values', () => {
      assert.equal(parseNumericValue(''), null);
      assert.equal(parseNumericValue(null), null);
      assert.equal(parseNumericValue(undefined), null);
      assert.equal(parseNumericValue('abc'), null);
      assert.equal(parseNumericValue(NaN), null);
    });
  });

  describe('BMI and Clinical Weight Status Calculations', () => {
    it('calculates BMI accurately for given weight and height', () => {
      // 72 kg, 180 cm -> 72 / 1.8^2 = 22.22... -> 22.2
      const bmi = calculateBMI(72, 180);
      assert.equal(bmi, 22.2);
    });

    it('categorizes underweight correctly (BMI < 18.5)', () => {
      const status = getWeightStatus(17.8);
      assert.equal(status.status, 'underweight');
      assert.equal(status.label, 'Underweight');
    });

    it('categorizes healthy normal weight correctly (18.5 <= BMI <= 24.9)', () => {
      const statusMin = getWeightStatus(18.5);
      const statusMid = getWeightStatus(22.0);
      const statusMax = getWeightStatus(24.9);
      assert.equal(statusMin.status, 'normal');
      assert.equal(statusMid.status, 'normal');
      assert.equal(statusMax.status, 'normal');
    });

    it('categorizes overweight correctly (25.0 <= BMI <= 29.9)', () => {
      const status = getWeightStatus(27.4);
      assert.equal(status.status, 'overweight');
      assert.equal(status.label, 'Overweight');
    });

    it('categorizes obese correctly (BMI >= 30.0)', () => {
      const status = getWeightStatus(32.1);
      assert.equal(status.status, 'obese');
      assert.equal(status.label, 'Obese (High Risk)');
    });
  });

  describe('Adult Reference Weight Range Calculation', () => {
    it('calculates expected reference range for height = 180 cm (~60.0 to 80.7 kg)', () => {
      // Height 180 cm:
      // min = 18.5 * 1.8^2 = 59.94 kg (~60.0 kg)
      // max = 24.9 * 1.8^2 = 80.676 kg (~80.7 kg)
      const range = calculateReferenceWeightRange(180);
      assert.ok(range !== null);
      assert.ok(Math.abs((range?.minWeight ?? 0) - 60.0) <= 0.2);
      assert.equal(range?.minWeight, 59.9);
      assert.equal(range?.maxWeight, 80.7);
      assert.equal(range?.midpointWeight, 70.3);
    });

    it('calculates expected reference range for height = 165 cm', () => {
      // Height 165 cm:
      // min = 18.5 * 1.65^2 = 50.366 -> 50.4 kg
      // max = 24.9 * 1.65^2 = 67.79 -> 67.8 kg
      const range = calculateReferenceWeightRange(165);
      assert.ok(range !== null);
      assert.equal(range?.minWeight, 50.4);
      assert.equal(range?.maxWeight, 67.8);
    });

    it('returns null for physiological out-of-bound heights', () => {
      assert.equal(calculateReferenceWeightRange(30), null); // too low
      assert.equal(calculateReferenceWeightRange(300), null); // too high
    });
  });

  describe('Dynamic Recalculation Flow', () => {
    it('immediately calculates weight range when Age, Height, and Gender are entered (Age=45, Height=180, Gender=Male)', () => {
      const result = getSmartWeightRecommendation({
        age: 45,
        height: 180,
        gender: 'MALE',
      });

      assert.equal(result.status, 'adult');
      assert.equal(result.isPediatric, false);
      assert.equal(result.hasRecommendation, true);
      assert.equal(result.minWeight, 59.9); // ~60.0 kg
      assert.equal(result.maxWeight, 80.7);
      assert.ok(result.genderContext?.includes('Male'));
      // Weight has not yet been entered
      assert.equal(result.bmi, undefined);
      assert.equal(result.weightStatus, undefined);
    });

    it('recalculates immediately when Gender is updated to Female without changing BMI thresholds', () => {
      const result = getSmartWeightRecommendation({
        age: 45,
        height: 180,
        gender: 'FEMALE',
      });

      assert.equal(result.status, 'adult');
      assert.ok(result.genderContext?.includes('Female'));
      // Standard thresholds are uniform
      assert.equal(result.minWeight, 59.9);
      assert.equal(result.maxWeight, 80.7);
    });

    it('calculates and displays BMI and weight status when Weight is entered or updated', () => {
      const resultNormal = getSmartWeightRecommendation({
        age: 45,
        height: 180,
        gender: 'MALE',
        weight: 72,
      });

      assert.equal(resultNormal.bmi, 22.2);
      assert.equal(resultNormal.weightStatus?.status, 'normal');

      // Update weight to 95 kg
      const resultOverweight = getSmartWeightRecommendation({
        age: 45,
        height: 180,
        gender: 'MALE',
        weight: 95,
      });

      assert.equal(resultOverweight.bmi, 29.3);
      assert.equal(resultOverweight.weightStatus?.status, 'overweight');
    });

    it('recalculates BOTH weight recommendation and BMI when Height changes after Weight has been entered', () => {
      // Initial state: height 180 cm, weight 75 kg
      const initial = getSmartWeightRecommendation({
        age: 35,
        height: 180,
        weight: 75,
        gender: 'FEMALE',
      });

      assert.equal(initial.minWeight, 59.9);
      assert.equal(initial.bmi, 23.1);
      assert.equal(initial.weightStatus?.status, 'normal');

      // Height updated to 160 cm while weight remains 75 kg
      const updated = getSmartWeightRecommendation({
        age: 35,
        height: 160,
        weight: 75,
        gender: 'FEMALE',
      });

      // Reference range must be recalculated for 160 cm:
      // min = 18.5 * 1.6^2 = 47.36 -> 47.4 kg
      // max = 24.9 * 1.6^2 = 63.74 -> 63.7 kg
      assert.equal(updated.minWeight, 47.4);
      assert.equal(updated.maxWeight, 63.7);

      // BMI must also be recalculated: 75 / 1.6^2 = 29.29... -> 29.3 kg/m² (Overweight)
      assert.equal(updated.bmi, 29.3);
      assert.equal(updated.weightStatus?.status, 'overweight');
    });
  });

  describe('Pediatric Handling (Age < 18)', () => {
    it('does NOT show adult weight range for patients under 18 and provides pediatric explanation', () => {
      const pediatric = getSmartWeightRecommendation({
        age: 15,
        height: 165,
        gender: 'MALE',
      });

      assert.equal(pediatric.isPediatric, true);
      assert.equal(pediatric.hasRecommendation, false);
      assert.equal(pediatric.minWeight, undefined);
      assert.equal(pediatric.maxWeight, undefined);
      assert.equal(pediatric.status, 'pediatric');
      assert.ok(pediatric.message.includes('under 18'));
      assert.ok(pediatric.message.includes('BMI-for-age'));
      assert.ok(pediatric.explanation.includes('pediatric guidelines'));
    });

    it('still calculates BMI for pediatric patients if weight is entered, but notes percentile requirement', () => {
      const pediatricWithWeight = getSmartWeightRecommendation({
        age: 12,
        height: 150,
        weight: 42,
        gender: 'FEMALE',
      });

      assert.equal(pediatricWithWeight.isPediatric, true);
      assert.equal(pediatricWithWeight.minWeight, undefined);
      assert.equal(pediatricWithWeight.maxWeight, undefined);
      assert.equal(pediatricWithWeight.bmi, 18.7);
      assert.ok(pediatricWithWeight.message.includes('under 18'));
    });
  });

  describe('Missing and Invalid Inputs Handling', () => {
    it('shows helpful message when both age and height are missing', () => {
      const result = getSmartWeightRecommendation({});
      assert.equal(result.status, 'missing_input');
      assert.equal(result.hasRecommendation, false);
      assert.equal(result.message, 'Enter age and height to view reference weight recommendations.');
      assert.equal(result.minWeight, undefined);
    });

    it('shows helpful message when age is missing', () => {
      const result = getSmartWeightRecommendation({ height: 175 });
      assert.equal(result.status, 'missing_input');
      assert.equal(result.hasRecommendation, false);
      assert.ok(result.message.includes('age'));
      assert.equal(result.minWeight, undefined);
    });

    it('shows helpful message when height is missing', () => {
      const result = getSmartWeightRecommendation({ age: 30 });
      assert.equal(result.status, 'missing_input');
      assert.equal(result.hasRecommendation, false);
      assert.ok(result.message.includes('height'));
      assert.equal(result.minWeight, undefined);
    });

    it('handles invalid negative or zero age', () => {
      const result = getSmartWeightRecommendation({ age: -5, height: 170 });
      assert.equal(result.status, 'invalid_input');
      assert.equal(result.hasRecommendation, false);
      assert.ok(result.message.includes('Age must be between'));
    });

    it('handles invalid out-of-bounds height (< 50 cm or > 250 cm)', () => {
      const resultLow = getSmartWeightRecommendation({ age: 40, height: 20 });
      assert.equal(resultLow.status, 'invalid_input');
      assert.ok(resultLow.message.includes('Height must be between'));

      const resultHigh = getSmartWeightRecommendation({ age: 40, height: 320 });
      assert.equal(resultHigh.status, 'invalid_input');
      assert.ok(resultHigh.message.includes('Height must be between'));
    });

    it('handles non-numeric string values safely', () => {
      const result = getSmartWeightRecommendation({ age: 'invalid', height: 'not-a-number' });
      assert.equal(result.status, 'missing_input');
      assert.equal(result.hasRecommendation, false);
    });
  });
});
