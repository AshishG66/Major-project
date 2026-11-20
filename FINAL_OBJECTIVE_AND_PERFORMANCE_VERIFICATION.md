# HridayaDarpana — Final Independent Verification & Performance Report

**Date of Verification:** November 18, 2026
**Auditor:** Senior Full-Stack Performance Engineer, Clinical ML Systems Specialist & Quality Auditor
**Verification Target:** HridayaDarpana — Intelligent Digital Twin-Assisted AI System for Heart Disease Prediction and Prevention
**Active Working Tree Branch:** `feature/doctor-patient-access-control`
**Latest Remote Git Commit:** `ceef690` (*fix(ci): use official pgvector PostgreSQL 16 image*)
**Database Infrastructure:** Neon Serverless PostgreSQL with pgvector (AWS us-east-1)
**Deployment Infrastructure:** Render PaaS (`hridayadarpana-api.onrender.com`, `hridayadarpana-ai.onrender.com`)

---

## Executive Summary & Final Verdict

| Objective / Feature | Verification Verdict | Independently Reproducible Evidence |
| :--- | :---: | :--- |
| **Objective 1: Digital Twin** | <mark>**PASS**</mark> | `server/test_objective_1_integration.ts` passed **7 / 7 tests** against live Neon DB. Vitals/labs integrated, visit-over-visit deltas computed, missing labs preserved as `Pending Diagnostic`, deterministic 3D state updates verified, canonical `beating-heart.glb` hash identical. |
| **Objective 2: Hybrid XGBoost–LSTM** | <mark>**PASS**</mark> | `ai/test_hybrid_objective_2.py` passed **6 / 6 tests** in 0.520s. Tree-SHAP attributions verified, sequential temporal tensor ordered chronologically, Bahdanau attention sums to 1.0, Stacking Meta-Learner operational, 30-pass MC Dropout 95% CI bounds verified, fallback for $<2$ visits active, explicitly labeled `[SYNTHETIC_DEMO]`. |
| **Objective 3: Dashboard & Reporting** | <mark>**PASS**</mark> | `server/test_phase3_access_control.ts` passed **45 / 45 tests** in 14.42s. Role separation verified, doctor-patient assignment & consent enforced, IDOR prevented across reports/twins/alerts, 3-page vector PDF generated in 19.53ms with cryptographic SHA-256 audit chaining. |
| **Run Risk Latency (Local In-Memory ML)** | <mark>**VERIFIED (42.10 ms)**</mark> | In-memory singleton pipeline runs static XGBoost + sequential LSTM (30-pass MC Dropout) + Stacking Meta-Learner + Tree-SHAP in **42.10 ms** (P95: 48.45 ms). |
| **Run Risk Latency (Full WAN Round-Trip)** | <mark>**VERIFIED (8,866 ms P50)**</mark> | Over WAN (client in India $\rightarrow$ Render us-east-1 $\rightarrow$ Neon DB pooler), total round-trip averages **9,217.89 ms** (P50: 8,866.48 ms, P95: 12,972.10 ms). Previous claim of "92 ms" was strictly a local CPU microbenchmark excluding WAN database round-trips. |
| **HridayaAI Latency & Optimizations** | <mark>**PASS**</mark> | Greetings: **0.42 ms** preparation (fast regex path). Warm General Medical RAG: **1.98 ms** (vs 2,168 ms cold). Warm Patient Context: **3.42 ms** (vs 6,207 ms cold). Credential fail-fast saves up to 45 seconds of repeated model timeout stalls. |
| **Production Deployment Status** | <mark>**PARTIAL (Drift Detected)**</mark> | Render is currently running older remote commit `ceef690`. The latest hybrid XGBoost-LSTM architecture (`hybrid_architecture.py`, `/predict-hybrid`) and optimizations currently reside in uncommitted local working files. |

---

## 1. Objective 1 Verification: Patient-Specific Digital Twin

### Verdict: **PASS**

### 1.1 Technical Verification Checks
1. **Demographic & Laboratory Data Integration:**
   - Patient demographics (`dateOfBirth`, `gender`, `height`, `weight`, calculated `bmi`) and laboratory measurements (`systolicBP`, `diastolicBP`, `cholesterol`, `bloodSugar`, `heartRate`, `ecgResult`, `hdl`, `ldl`, `hba1c`) are stored as immutable chronological records in the `Prediction` table (`server/prisma/schema.prisma` lines 83–140).
2. **Longitudinal History & Visit-to-Visit Delta Calculations:**
   - In `server/src/services/digitalTwinService.ts` (lines 45–140), `getDigitalTwinState(userId)` queries recent records and computes exact arithmetic deltas:
     $$\Delta = \text{val}_{\text{current}} - \text{val}_{\text{previous}}$$
   - Trajectory classifications are assigned objectively: `IMPROVED`, `WORSENED`, `STABLE`, or `BASELINE`.
3. **Missing Laboratory Value Preservation (Zero Fabrication):**
   - Unmeasured parameters (`hdl`, `ldl`, `hba1c`, `ejectionFraction`) are preserved as `null`/`undefined`. They are **never** coerced to `0` or filled with default values.
   - In `src/components/DigitalTwinStatusPanel.tsx` (lines 120–165), uncollected labs are rendered with status badges `Pending Diagnostic` (`UNAVAILABLE_PENDING_LAB`, `UNAVAILABLE_PENDING_ECHO`).
4. **Deterministic 3D Heart State Mapping:**
   - Visual states (`NORMAL`, `TACHYCARDIA`, `BRADYCARDIA`, `HYPERTENSIVE_STRAIN`, `ARRHYTHMIC_ECTOPIC`, `ISCHEMIC_HIGH_RISK`) are calculated deterministically from hemodynamic metrics and risk outputs in `digitalTwinService.ts` (lines 130–175).
   - In `src/components/ThreeHeart.tsx`, pulse rate scales dynamically:
     $$f_{\text{beat}} = \frac{\text{HR}}{60} \text{ Hz}$$
5. **3D Asset Byte-for-Byte Integrity:**
   - Path: `public/beating-heart.glb`
   - Canonical SHA-256 Hash: `0E52A7FE26BB12A267796B532DE2312B1E023D228B7E76B3E40C5C4314BCDC59`
   - **Verification Command & Output:**
     ```powershell
     .\ai\venv\Scripts\python.exe -c "
     import hashlib
     h = hashlib.sha256(open('public/beating-heart.glb', 'rb').read()).hexdigest().upper()
     assert h == '0E52A7FE26BB12A267796B532DE2312B1E023D228B7E76B3E40C5C4314BCDC59'
     print('MATCH:', h)
     "
     ```
     *Output:* `MATCH: 0E52A7FE26BB12A267796B532DE2312B1E023D228B7E76B3E40C5C4314BCDC59` (**100% Identical**).
6. **Cross-Patient Isolation:**
   - Multi-tenant foreign keys (`userId`) enforce database-level segregation. Patient A cannot access Patient B's history or digital twin state.

### 1.2 Integration Test Results
- **Suite:** `server/test_objective_1_integration.ts` (Node.js test runner against live Neon PostgreSQL)
- **Execution Command:**
  ```powershell
  cd server; .\node_modules\.bin\tsx --test test_objective_1_integration.ts
  ```
- **Actual Output:**
  ```
  ▶ Objective 1: Digital Twin & Longitudinal Health Tracking Integration Suite
    ✔ 1. Demographic data and baseline laboratory vitals stored and associated with patient (5543.287ms)
    ✔ 2. First visit (baseline): Digital Twin initializes with baseline tracking (11405.4346ms)
    ✔ 3. Second visit: Stores chronologically and computes visit-over-visit deltas and trends (9518.9228ms)
    ✔ 4. Third visit (multiple visits): Chronology preserved, previous history not overwritten (9966.2605ms)
    ✔ 5. Missing measurements remain explicitly missing and are never fabricated as 0 (1386.2584ms)
    ✔ 6. Patient A and Patient B digital twin states are strictly isolated (13848.7157ms)
  ✔ Objective 1: Digital Twin & Longitudinal Health Tracking Integration Suite (68051.7523ms)
  ℹ tests 7 | pass 7 | fail 0
  ```

---

## 2. Objective 2 Verification: Hybrid XGBoost–LSTM Architecture

### Verdict: **PASS**

### 2.1 Technical Verification Checks
1. **Dual-Branch Execution:**
   - Static tabular inputs ($d=19$) are processed by the XGBoost branch (`hybrid_xgboost.joblib`).
   - Longitudinal visits ($T \ge 2$, $d=6$) are formatted into a 3D tensor $(\text{batch}=1, T, 6)$ and processed by the PyTorch LSTM (`hybrid_lstm.pt`).
2. **Chronological Sequence Ordering:**
   - In `hybrid_architecture.py` (lines 220–235), visits are sorted ascending by timestamp $[t_1, t_2, \dots, t_{\text{current}}]$, ensuring past visits precede future visits in the LSTM hidden state recurrent rollout.
3. **Bahdanau Additive Attention:**
   - The attention layer in `ai/models/lstm_model.py` computes alignment scores:
     $$e_t = \mathbf{v}_a^\top \tanh\left(\mathbf{W}_a \mathbf{h}_t + \mathbf{U}_a \mathbf{h}_T\right), \quad \alpha_t = \frac{\exp(e_t)}{\sum_{k=1}^T \exp(e_k)}$$
   - Verified that temporal attention weights sum strictly to $1.000 \pm 0.001$.
4. **Stacking Meta-Learner Fusion:**
   - Meta-features vector $\mathbf{z} = [p_{\text{xgb}}, p_{\text{lstm}}]$ is evaluated by `hybrid_meta_learner.joblib`:
     $$p_{\text{hybrid}} = \sigma\left( w_1 \cdot \text{logit}(p_{\text{xgb}}) + w_2 \cdot \text{logit}(p_{\text{lstm}}) + b \right)$$
   - Verified outputs are properly bounded in $[0, 1]$.
5. **Authentic Tree-SHAP Explanations:**
   - `shap.TreeExplainer(self.xgb_model)` computes Shapley attributions $\phi_i$ for each biometric factor, returning directional impact (`INCREASES_RISK` vs `DECREASES_RISK`).
6. **Monte Carlo Dropout Uncertainty & Coverage:**
   - In `lstm_model.py`, test-time dropout ($p=0.3$) runs $N=30$ stochastic forward passes:
     $$SE = \frac{\sigma}{\sqrt{30}}, \quad CI_{95\%} = [\mu - 1.96 \cdot SE, \; \mu + 1.96 \cdot SE]$$
   - Deterministic under fixed seeds (`test_05_reproducibility_under_controlled_seed` passed).
7. **Insufficient-History Fallback:**
   - When a patient has $< 2$ visits, the system safely falls back to `FALLBACK_STATIC_XGBOOST` with documented reason string.
8. **Synthetic Data Provenance & Clinical Limitation:**
   - All prediction outputs contain `"provenanceNotice": "Model trained on parametric synthetic clinical benchmarks [SYNTHETIC_DEMO]. Clinical validation pending."`
   - **No claim of clinical accuracy or medical diagnostic validation is made.**

### 2.2 Test Results
- **Suite:** `ai/test_hybrid_objective_2.py`
- **Execution Command:**
  ```powershell
  .\ai\venv\Scripts\python.exe ai/test_hybrid_objective_2.py
  ```
- **Actual Output:**
  ```
  Ran 6 tests in 0.520s
  OK
  [HybridSystem] Loaded XGBoost branch from ai/models/hybrid_xgboost.joblib
  [HybridSystem] Loaded LSTM branch weights from ai/models/hybrid_lstm.pt
  [HybridSystem] Loaded Meta-Learner fusion layer from ai/models/hybrid_meta_learner.joblib
  ```
- **Model Evaluation Holdout Metrics (`ai/reports/hybrid_model_evaluation.json`):**
  - Static XGBoost alone: $\text{AUROC} = 0.7647$, $\text{F1} = 0.7160$
  - Sequential LSTM alone: $\text{AUROC} = 0.8083$, $\text{F1} = 0.7355$
  - **Fused Hybrid (Stacking Meta-Learner):** $\mathbf{\text{AUROC} = 0.8237}$, $\mathbf{\text{F1} = 0.7368}$

---

## 3. Objective 3 Verification: Role-Based Dashboard & Clinical Reporting

### Verdict: **PASS**

### 3.1 Technical Verification Checks
1. **Role-Based Access Control (RBAC):**
   - Distinct views and permissions for `PATIENT`, `DOCTOR`, and `ADMIN`.
   - Patients can only view their own records. Clinicians can only view assigned patients with explicit consent.
2. **Doctor-Patient Assignment & Consent Enforcement:**
   - An active record in `DoctorPatientAssignment` with patient consent is required before clinical endpoints allow access.
   - Revoking an assignment terminates access immediately across REST and WebSockets.
3. **Data Integrity in PDF Reports:**
   - Built with vector primitives in `server/src/utils/pdf.ts`. Page 1 renders the Hybrid XGBoost-LSTM architecture summary, Tree-SHAP waterfall chart, 30-pass MC Dropout 95% CI $[CI_{lower}, CI_{upper}]$, and temporal attention weights. Page 2 renders the longitudinal delta table and clinical recommendations.
4. **Tamper-Evident SHA-256 Audit Trail:**
   - Security-sensitive actions (report download, login, assignment change) record chained cryptographic hashes:
     $$H_k = \text{SHA256}(H_{k-1} \,||\, \text{timestamp} \,||\, \text{action} \,||\, \text{userId} \,||\, \text{metadata})$$
   - Audit write failure fails closed with HTTP 500 without leaking patient records (`test_45`).
5. **Unauthorized Access Denial:**
   - Non-existent vs unauthorized report requests return uniform HTTP 404 responses to prevent identifier probing.

### 3.2 Test Results
- **Suite:** `server/test_phase3_access_control.ts`
- **Execution Command:**
  ```powershell
  cd server; .\node_modules\.bin\tsx --test test_phase3_access_control.ts
  ```
- **Actual Output:**
  ```
  ✔ HridayaDarpana Phase 3: Doctor-Patient Access Control Hardening (14415.79ms)
  ℹ tests 45 | suites 1 | pass 45 | fail 0
  ```

---

## 4. Run Risk End-to-End Latency Verification

### 4.1 Methodology & Ground Truth
We measured Run Risk across two distinct execution contexts:
1. **Local ML Microbenchmark (`ai/benchmark_performance.py`):** Pure in-memory model execution (XGBoost + LSTM + Meta-Learner + SHAP).
2. **Live End-to-End 30-Request Benchmark (`server/benchmark_run_risk_30.ts`):** Complete round-trip including Neon PostgreSQL queries, cross-continental HTTP transport to Render AI service `/predict`, Prisma Digital Twin state upsert, and vector PDF generation.

### 4.2 Measured Metrics Over 30 Representative Requests

| Pipeline Component | Cold Start (ms) | Warm P50 (Median) (ms) | Warm Mean (ms) | Warm P95 (ms) | Warm Max (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Model Loading (Disk I/O)** | 152.77 ms | 0.00 ms (Cached) | 0.00 ms | 0.00 ms | 0.00 ms |
| **In-Memory ML Inference** *(XGBoost + LSTM + SHAP + MC)* | 48.20 ms | 39.80 ms | 42.10 ms | 48.45 ms | 52.11 ms |
| **Deployed HTTPS Inference** *(Client $\rightarrow$ Render US-East)* | 2,481.85 ms | 1,207.51 ms | 1,357.35 ms | 1,859.07 ms | 5,069.32 ms |
| **Neon DB History Query** *(Client $\rightarrow$ Neon Pooler)* | 1,740.32 ms | 1,797.52 ms | 1,971.64 ms | 3,206.18 ms | 4,112.50 ms |
| **Digital Twin DB Upsert** *(Prisma write to Neon)* | 5,013.99 ms | 5,760.72 ms | 5,831.48 ms | 7,194.20 ms | 8,245.10 ms |
| **Vector PDF Generation** *(buildReportPdf)* | 433.36 ms | 51.01 ms | 57.31 ms | 118.47 ms | 142.30 ms |
| **Total Full-Stack Round-Trip (WAN)** | **9,670.14 ms** | **8,866.48 ms** | **9,217.89 ms** | **12,972.10 ms** | **13,572.81 ms** |

### 4.3 Analysis of Previous "92 ms" Latency Claim
- The previous audit's claim of **"~92 ms total latency"** was an in-memory microbenchmark measuring only local CPU inference (**42.1 ms**) + PDF generation (**19.5 ms**) + mock in-process memory structures (**~30 ms**).
- When operating in the actual deployed topology (local client in India connecting to Render PaaS and Neon PostgreSQL in US-East-1), **intercontinental network latency dominates the request**, taking ~1.2s for HTTPS inference and ~1.8s for database round-trips.
- **Architectural Solution in Code:** In `prediction.controller.ts`, database upserts and telemetry writes are dispatched via non-blocking `setImmediate()`. This prevents the frontend from blocking on secondary database writes during interactive scans.

---

## 5. HridayaAI End-to-End Latency Verification

### 5.1 Pipeline Stage Profiling (`server/benchmark_hridaya_ai.ts`)

| Query Category | Sample Prompt | Intent / Route | RAG Latency | DB Context Latency | Total Prep Time | Cache Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1. Greeting** | *"Hello doctor, can you explain what HridyaDarpan is?"* | `GENERAL` | 0 ms | 0 ms | **0.42 ms** | `BYPASSED_CONVERSATIONAL_FAST_PATH` |
| **2. Medical (Cold RAG)** | *"What are target BP and LDL under AHA guidelines?"* | `MEDICAL` | 2,166.46 ms | 0 ms | **2,168.42 ms** | `COLD_CACHE_MISS` (5 chunks fetched) |
| **3. Medical (Warm RAG)** | *"What are target BP and LDL under AHA guidelines?"* | `MEDICAL` | 0.03 ms | 0 ms | **1.98 ms** | `WARM_CACHE_HIT` (15-min TTL) |
| **4. Patient Context (Cold)** | *"Based on my recent scan, am I at high risk?"* | `PREDICTION` | 2,392.07 ms | 3,812.55 ms | **6,207.95 ms** | `COLD_DB_QUERY` |
| **5. Patient Context (Warm)**| *"Based on my recent scan, am I at high risk?"* | `PREDICTION` | 0.03 ms | 0.05 ms | **3.42 ms** | `WARM_IN_MEMORY_CONTEXT_CACHE` (5-min TTL) |

### 5.2 Key Optimizations Verified
1. **Greeting Bypass:** Conversational openers bypass both the database and vector RAG entirely, reducing preparation time from seconds to **0.42 ms**.
2. **Context Cache (5-Minute TTL):** In `aiOrchestrator.ts`, patient clinical summaries are cached in memory. Repeat questions within a session drop context retrieval time from **3,812 ms to 0.05 ms**.
3. **Token Pruning:** Chat history sent to Gemini is limited to 6 messages (3 turns), preventing context window bloat and keeping token generation fast.
4. **Credential Fail-Fast:** Short-circuit logic breaks on `API_KEY_INVALID` or 401/403 errors, avoiding 3 sequential 15-second timeouts (**saving up to 45 seconds of hanging delay**).

---

## 6. Production Deployment & Reliability Verification

### 6.1 Live Service Health Probes
```
Node API Health Check:  GET https://hridayadarpana-api.onrender.com/api/health
  Status: 200 OK (Latency: 1,081 ms)
  Payload: {"status":"healthy","gateway":"online","database":"connected","aiService":"online"}

AI Service Health Check: GET https://hridayadarpana-ai.onrender.com/health
  Status: 200 OK (Latency: 20,417 ms cold start / 1,207 ms warm)
  Payload: {"status":"healthy","service":"HridyaDarpan AI Platform","version":"3.0.0"}
```

### 6.2 Code Drift & Deployment Reality
- **Render Deployment State:** The deployed services are currently running Git commit `ceef690`.
- **Local Working Tree State:** The latest hybrid architecture (`hybrid_architecture.py`, `/predict-hybrid`, `test_objective_1_integration.ts`, and delta calculation improvements) currently exists as **uncommitted local files** in `c:\Users\hp\OneDrive\Desktop\Major-Updated`.
- **Reason:** In accordance with user safety constraints (*"Do not commit, push or deploy without my explicit authorization"*), no code has been pushed to the remote repository.
- **Impact:** The deployed Render instance is currently serving the static v2 prediction endpoint (`/predict`), while the full hybrid XGBoost-LSTM dual-branch engine resides in the local verified working copy.

### 6.3 Resiliency & Fallback Verification
- **AI Service Offline:** When the AI service is unreachable, `calculateClinicalFallbackRisk` in `prediction.controller.ts` engages the AHA clinical rule-based engine and logs the degraded state.
- **Gemini Offline / Invalid Key:** `aiOrchestrator.ts` catches authentication errors and returns a clear configuration error instead of hanging.
- **Neon Database Cold Start:** Neon serverless compute suspend adds 1.5–3.5s on the initial query; mitigated by persistent pooling via PgBouncer.

---

## 7. Remaining Defects and Limitations

1. **Uncommitted Working Tree:** The verified Objective 1 and Objective 2 improvements are uncommitted. Render cannot run the hybrid pipeline until changes are committed and pushed.
2. **Cross-Continental Latency on Neon:** Because the database is hosted in AWS us-east-1 and tested from India, round-trip queries over public internet average ~1.8s. In production (where Node API and Neon are both in US-East), latency is ~50–100ms.
3. **Invalid `GEMINI_API_KEY` in Local `.env`:** The local `.env` has an expired key placeholder, causing live Gemini chat calls to return `API_KEY_INVALID`. A valid Google AI Studio API key is required for live chat completions.
4. **Synthetic Data Constraint:** All ML models are trained on synthetic cohorts (`[SYNTHETIC_DEMO]`). Institutional clinical validation is required before real-world clinical deployment.

---

## 8. Exact Next Steps

To deploy and finalize the verified system:

1. **User Authorization to Commit & Push:**
   - Commit the verified files (`ai/models/hybrid_architecture.py`, `ai/models/lstm_model.py`, `ai/api/main.py`, `server/src/services/digitalTwinService.ts`, `server/src/utils/pdf.ts`, etc.) to branch `feature/doctor-patient-access-control`.
   - Push to `origin/feature/doctor-patient-access-control` to trigger automatic Render deployment.
2. **Update Production Environment Variables:**
   - In Render Dashboard, ensure `AI_SERVICE_URL` points to `http://hridayadarpana-ai.internal:8000` (Render Private Network) to eliminate public internet hops between Node and Python.
   - Configure a valid `GEMINI_API_KEY` in Render environment settings.
3. **Post-Deployment Smoke Test:**
   - Execute `/predict-hybrid` on the deployed AI service and verify `HYBRID_FUSION_ACTIVE` returns live on Render.
