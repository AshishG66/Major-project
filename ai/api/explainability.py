from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import copy

router = APIRouter()

class WhatIfRequest(BaseModel):
    """Current patient factors + one modified factor for simulation."""
    # Current values
    age: int = Field(..., ge=0, le=120)
    gender: int = Field(..., ge=0, le=1)
    height: float = Field(..., ge=50, le=250)
    weight: float = Field(..., ge=10, le=300)
    bmi: float = Field(..., ge=5, le=100)
    systolicBP: int = Field(..., ge=50, le=250)
    diastolicBP: int = Field(..., ge=30, le=150)
    cholesterol: int = Field(..., ge=50, le=500)
    heartRate: int = Field(..., ge=30, le=220)
    bloodSugar: int = Field(..., ge=30, le=500)
    ecgResult: int = Field(..., ge=0, le=2)
    exerciseFrequency: int = Field(..., ge=0, le=7)
    smoking: int = Field(..., ge=0, le=1)
    alcohol: int = Field(..., ge=0, le=1)
    diabetes: int = Field(..., ge=0, le=1)
    familyHistory: int = Field(..., ge=0, le=1)
    chestPainType: int = Field(..., ge=0, le=3)
    sleepDuration: float = Field(..., ge=0, le=24)
    stressLevel: int = Field(..., ge=1, le=10)
    
    # Modified factor
    modifiedFactor: str = Field(..., description="Name of the factor to modify")
    modifiedValue: float = Field(..., description="New value for the modified factor")


class TrendRequest(BaseModel):
    """Historical prediction records for trend analysis."""
    predictions: List[dict]


def get_predictor():
    """Import predictor from main module."""
    import sys, os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from models.prediction.predict import HeartDiseasePredictor
    model_dir = "ai/models/prediction/"
    return HeartDiseasePredictor(model_dir=model_dir)


@router.post("/what-if")
def what_if_simulation(request: WhatIfRequest):
    """
    Run prediction with original and modified values.
    Returns original risk, modified risk, delta, and natural language explanation.
    """
    try:
        predictor = get_predictor()
        
        # Build original factors dict
        original_factors = {
            "age": request.age,
            "gender": request.gender,
            "height": request.height,
            "weight": request.weight,
            "bmi": request.bmi,
            "systolicBP": request.systolicBP,
            "diastolicBP": request.diastolicBP,
            "cholesterol": request.cholesterol,
            "heartRate": request.heartRate,
            "bloodSugar": request.bloodSugar,
            "ecgResult": request.ecgResult,
            "exerciseFrequency": request.exerciseFrequency,
            "smoking": request.smoking,
            "alcohol": request.alcohol,
            "diabetes": request.diabetes,
            "familyHistory": request.familyHistory,
            "chestPainType": request.chestPainType,
            "sleepDuration": request.sleepDuration,
            "stressLevel": request.stressLevel,
        }
        
        # Build modified factors
        modified_factors = copy.deepcopy(original_factors)
        factor_name = request.modifiedFactor
        
        if factor_name not in modified_factors:
            raise HTTPException(status_code=400, detail=f"Unknown factor: {factor_name}")
        
        # Store original value before modification
        original_value = modified_factors[factor_name]
        modified_factors[factor_name] = request.modifiedValue
        
        # Recalculate BMI if height or weight changed
        if factor_name in ("height", "weight"):
            h = modified_factors["height"]
            w = modified_factors["weight"]
            modified_factors["bmi"] = round(w / ((h / 100) ** 2), 1)
        
        # Run both predictions
        original_result = predictor.predict(original_factors)
        modified_result = predictor.predict(modified_factors)
        
        original_risk = original_result["riskScore"]
        modified_risk = modified_result["riskScore"]
        delta = modified_risk - original_risk
        
        # Generate natural language explanation
        factor_display = {
            "systolicBP": "systolic blood pressure",
            "diastolicBP": "diastolic blood pressure",
            "cholesterol": "total cholesterol",
            "bloodSugar": "fasting blood sugar",
            "bmi": "BMI",
            "heartRate": "resting heart rate",
            "exerciseFrequency": "weekly exercise frequency",
            "smoking": "smoking status",
            "alcohol": "alcohol consumption",
            "sleepDuration": "sleep duration",
            "stressLevel": "stress level",
            "weight": "body weight",
        }
        
        factor_label = factor_display.get(factor_name, factor_name)
        
        if delta < -5:
            impact = "significant improvement"
            emoji = "🟢"
        elif delta < 0:
            impact = "moderate improvement"
            emoji = "🟡"
        elif delta == 0:
            impact = "no significant change"
            emoji = "⚪"
        elif delta < 5:
            impact = "moderate increase in risk"
            emoji = "🟠"
        else:
            impact = "significant increase in risk"
            emoji = "🔴"
        
        explanation = (
            f"{emoji} If you {'reduce' if request.modifiedValue < original_value else 'increase'} "
            f"your {factor_label} from {original_value} to {request.modifiedValue}, "
            f"your predicted cardiovascular risk {'drops' if delta < 0 else 'increases'} "
            f"from {original_risk:.1f}% → {modified_risk:.1f}% "
            f"(a {abs(delta):.1f}% {'improvement' if delta < 0 else 'increase'}). "
            f"This represents a {impact}."
        )
        
        return {
            "originalRisk": round(original_risk, 2),
            "originalLevel": original_result["riskLevel"],
            "modifiedRisk": round(modified_risk, 2),
            "modifiedLevel": modified_result["riskLevel"],
            "delta": round(delta, 2),
            "factorModified": factor_name,
            "originalValue": original_value,
            "modifiedValue": request.modifiedValue,
            "explanation": explanation,
            "impact": impact,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trends")
def analyze_trends(request: TrendRequest):
    """
    Analyze risk score trends over time with confidence intervals.
    Returns trend direction, rate of change, and natural language summary.
    """
    try:
        predictions = request.predictions
        
        if len(predictions) < 2:
            return {
                "trend": "insufficient_data",
                "message": "At least 2 prediction records are needed for trend analysis.",
                "records": len(predictions),
            }
        
        # Sort by date (expect 'createdAt' field)
        sorted_preds = sorted(predictions, key=lambda p: p.get("createdAt", ""))
        
        # Extract risk scores
        scores = [p.get("riskScore", 0) for p in sorted_preds]
        n = len(scores)
        
        # Simple linear regression for trend
        x_vals = list(range(n))
        x_mean = sum(x_vals) / n
        y_mean = sum(scores) / n
        
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, scores))
        denominator = sum((x - x_mean) ** 2 for x in x_vals)
        
        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean
        
        # R-squared (coefficient of determination)
        ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(x_vals, scores))
        ss_tot = sum((y - y_mean) ** 2 for y in scores)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # Standard deviation for confidence interval
        std_dev = (sum((s - y_mean) ** 2 for s in scores) / max(n - 1, 1)) ** 0.5
        
        # 95% confidence interval (approximate using 1.96 * SE)
        se = std_dev / (n ** 0.5) if n > 0 else 0
        ci_lower = y_mean - 1.96 * se
        ci_upper = y_mean + 1.96 * se
        
        # Determine trend direction
        if slope < -1:
            direction = "improving"
            emoji = "📉"
        elif slope > 1:
            direction = "worsening"
            emoji = "📈"
        else:
            direction = "stable"
            emoji = "➡️"
        
        # Rate of change per scan
        rate_per_scan = round(slope, 2)
        total_change = round(scores[-1] - scores[0], 1)
        
        # Generate summary
        summary = (
            f"{emoji} Your cardiovascular risk trend is **{direction}**. "
            f"Over {n} scans, your risk score moved from {scores[0]:.1f}% to {scores[-1]:.1f}% "
            f"(net change: {'+' if total_change > 0 else ''}{total_change}%). "
            f"Average rate of change: {'+' if rate_per_scan > 0 else ''}{rate_per_scan}% per scan. "
            f"Current mean risk: {y_mean:.1f}% "
            f"(95% CI: {ci_lower:.1f}% — {ci_upper:.1f}%)."
        )
        
        # Per-prediction trend data for charting
        trend_line = [
            {"index": i, "predicted": round(slope * i + intercept, 2), "actual": round(s, 2)}
            for i, s in enumerate(scores)
        ]
        
        return {
            "trend": direction,
            "slope": rate_per_scan,
            "rSquared": round(r_squared, 3),
            "meanRisk": round(y_mean, 2),
            "stdDev": round(std_dev, 2),
            "confidenceInterval": {
                "lower": round(ci_lower, 2),
                "upper": round(ci_upper, 2),
                "level": "95%",
            },
            "totalChange": total_change,
            "latestScore": round(scores[-1], 2),
            "earliestScore": round(scores[0], 2),
            "scanCount": n,
            "summary": summary,
            "trendLine": trend_line,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
