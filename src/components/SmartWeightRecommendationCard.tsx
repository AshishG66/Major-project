import React from 'react';
import { Scale, Info, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import type { SmartWeightRecommendationResult } from '../utils/weightRecommendation';

interface SmartWeightRecommendationCardProps {
  recommendation: SmartWeightRecommendationResult;
  onApplySuggestedWeight?: (weight: number) => void;
  hasMeasuredWeight: boolean;
}

export default function SmartWeightRecommendationCard({
  recommendation,
  onApplySuggestedWeight,
  hasMeasuredWeight,
}: SmartWeightRecommendationCardProps) {
  const {
    status,
    isPediatric,
    hasRecommendation,
    message,
    minWeight,
    maxWeight,
    midpointWeight,
    bmi,
    weightStatus,
    genderContext,
    explanation,
  } = recommendation;

  return (
    <div className="rounded-2xl border border-[#c3c5d9] bg-gradient-to-br from-white to-[#f8faff] p-4.5 shadow-sm space-y-3 transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#eff4ff] text-[#0052ff]">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-geist font-bold text-[#0b1c30]">
              Smart Weight Recommendation & BMI
            </h4>
            <p className="text-[10px] font-inter text-[#737688]">
              Evidence-based adult cardiovascular reference
            </p>
          </div>
        </div>

        {genderContext && (
          <span className="text-[10px] font-mono-data font-semibold text-[#0052ff] bg-[#eff4ff] px-2.5 py-0.5 rounded-full border border-[#0052ff]/20">
            {genderContext}
          </span>
        )}
      </div>

      {/* Case 1: Missing or Invalid Input */}
      {(status === 'missing_input' || status === 'invalid_input') && (
        <div className="flex items-start space-x-3 p-3 rounded-xl bg-[#eff4ff]/70 border border-[#0052ff]/20 text-xs text-[#0b1c30]">
          <Info className="h-4 w-4 text-[#0052ff] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-geist font-medium text-[#0b1c30]">{message}</p>
            <p className="text-[10px] text-[#737688] font-inter">{explanation}</p>
          </div>
        </div>
      )}

      {/* Case 2: Pediatric (<18 years) */}
      {isPediatric && (
        <div className="space-y-2">
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-geist font-bold text-[11px] uppercase tracking-wide text-amber-800 block">
                Pediatric Reference Required
              </span>
              <p className="font-geist text-xs text-amber-900">{message}</p>
              <p className="text-[10px] text-amber-700 font-inter">{explanation}</p>
            </div>
          </div>

          {bmi !== undefined && (
            <div className="p-3 rounded-xl bg-white border border-[#c3c5d9] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#737688] block">Pediatric Calculated BMI</span>
                <span className="font-mono-data font-bold text-[#0b1c30] text-sm">{bmi} kg/m²</span>
              </div>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                Interpret via WHO/CDC Growth Percentiles
              </span>
            </div>
          )}
        </div>
      )}

      {/* Case 3: Adult Recommendation (Age >= 18) */}
      {hasRecommendation && minWeight !== undefined && maxWeight !== undefined && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reference Weight Range Box */}
            <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#0052ff]/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-geist font-bold uppercase tracking-wider text-[#0052ff]">
                  Recommended Reference Weight
                </span>
                <Sparkles className="h-3 w-3 text-[#0052ff]" />
              </div>
              <div className="flex items-baseline space-x-1.5 my-1">
                <span className="font-mono-data font-extrabold text-[#0052ff] text-xl">
                  {minWeight.toFixed(1)} – {maxWeight.toFixed(1)}
                </span>
                <span className="text-xs font-geist font-semibold text-[#434656]">kg</span>
              </div>
              <span className="text-[10px] text-[#737688] font-inter">
                Healthy BMI reference bounds (18.5 – 24.9 kg/m²)
              </span>
            </div>

            {/* Current Weight & BMI Status Box */}
            <div className="p-3 rounded-xl bg-white border border-[#c3c5d9] flex flex-col justify-between">
              <span className="text-[10px] font-geist font-bold uppercase tracking-wider text-[#737688]">
                Patient Status & BMI
              </span>

              {hasMeasuredWeight && bmi !== undefined && weightStatus ? (
                <div className="my-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-data font-bold text-sm text-[#0b1c30]">
                      {bmi} <span className="text-[10px] font-normal text-[#737688]">kg/m²</span>
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold font-geist border"
                      style={{
                        backgroundColor: weightStatus.bgLight,
                        borderColor: weightStatus.badgeBorder,
                        color: weightStatus.color,
                      }}
                    >
                      {weightStatus.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#737688] font-inter leading-tight">
                    {weightStatus.description}
                  </p>
                </div>
              ) : (
                <div className="my-1.5">
                  <p className="text-xs text-[#737688] italic">
                    Enter patient's measured weight above to view BMI & status.
                  </p>
                </div>
              )}

              {/* Optional explicit action: Use Suggested Midpoint */}
              {!hasMeasuredWeight && midpointWeight !== undefined && onApplySuggestedWeight && (
                <button
                  type="button"
                  onClick={() => onApplySuggestedWeight(midpointWeight)}
                  className="mt-1 text-[10px] font-geist font-semibold text-[#0052ff] hover:text-[#003ec7] hover:underline flex items-center space-x-1 self-start"
                >
                  <span>Use reference midpoint ({midpointWeight} kg)</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* Clinical Formula Explanation */}
          <div className="flex items-start space-x-2 pt-1 text-[10px] text-[#737688]">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-inter leading-relaxed">{explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
