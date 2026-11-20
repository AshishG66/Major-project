import os
import sys
import time
import json
import numpy as np

# Ensure ai directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from models.hybrid_architecture import HybridXGBoostLSTMSystem

def profile_hybrid():
    t0 = time.perf_counter()
    pipeline = HybridXGBoostLSTMSystem()
    load_time_ms = (time.perf_counter() - t0) * 1000.0

    patient_sample = {
        'age': 58, 'sex': 1, 'chestPainType': 2, 'restingBP': 140, 'cholesterol': 240,
        'fastingBS': 0, 'restingECG': 1, 'maxHR': 130, 'exerciseAngina': 1,
        'oldpeak': 1.8, 'ST_Slope': 2, 'bmi': 28.4, 'smokingStatus': 'ACTIVE',
        'hasDiabetes': False, 'familyHistory': True
    }

    history_3_visits = [
        {'systolicBP': 150, 'diastolicBP': 95, 'cholesterol': 260, 'bloodSugar': 120, 'heartRate': 85, 'bmi': 29.2, 'daysAgo': 180},
        {'systolicBP': 145, 'diastolicBP': 90, 'cholesterol': 250, 'bloodSugar': 110, 'heartRate': 80, 'bmi': 28.8, 'daysAgo': 90},
        {'systolicBP': 140, 'diastolicBP': 88, 'cholesterol': 240, 'bloodSugar': 105, 'heartRate': 75, 'bmi': 28.4, 'daysAgo': 0}
    ]

    # Warmup
    pipeline.run_prediction(patient_sample, history_3_visits)

    # 10 iterations profiling
    total_latencies = []
    for _ in range(10):
        t_start = time.perf_counter()
        res = pipeline.run_prediction(patient_sample, history_3_visits)
        elapsed = (time.perf_counter() - t_start) * 1000.0
        total_latencies.append(elapsed)

    # Baseline only (no history)
    baseline_latencies = []
    for _ in range(10):
        t_start = time.perf_counter()
        res_baseline = pipeline.run_prediction(patient_sample, None)
        elapsed = (time.perf_counter() - t_start) * 1000.0
        baseline_latencies.append(elapsed)

    results = {
        'model_load_ms': round(load_time_ms, 2),
        'hybrid_predict_mean_ms': round(float(np.mean(total_latencies)), 2),
        'hybrid_predict_p95_ms': round(float(np.percentile(total_latencies, 95)), 2),
        'hybrid_predict_min_ms': round(float(np.min(total_latencies)), 2),
        'hybrid_predict_max_ms': round(float(np.max(total_latencies)), 2),
        'baseline_predict_mean_ms': round(float(np.mean(baseline_latencies)), 2),
        'hybrid_status': res['hybridStatus'],
        'fusion_strategy': res['fusionStrategy'],
        'meta_learner_prob': res['probability'],
        'ci_95': res['uncertainty']['confidenceInterval95'],
        'mc_dropout_passes': res['uncertainty'].get('monteCarloPasses'),
        'shap_factors_count': len(res['xgboostBranch']['featureAttributions']),
        'temporal_attention_steps': len(res['lstmBranch']['details']['attentionWeights']) if res['lstmBranch'].get('details') else 0
    }
    print(json.dumps(results, indent=2))
    return results

if __name__ == '__main__':
    profile_hybrid()
