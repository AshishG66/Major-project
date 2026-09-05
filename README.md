# HridyaDarpan (हृदय दर्पण) 🫀
> **AI-Powered Real-Time Cardiovascular Clinical Intelligence Platform & 3D Digital Heart Twin**

[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000.svg)](https://expressjs.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.139-009688.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Project Overview

**HridyaDarpan** (*Hindi: Mirror of the Heart*) is a hospital-grade, AI-driven cardiovascular health SaaS platform designed for early risk prediction, real-time physiological modeling via interactive 3D Digital Heart Twin, multi-agent AI clinical consultations, and instant location-based emergency cardiac care matching.

Built for patients, cardiologists, and healthcare administrators, HridyaDarpan combines clinical predictive algorithms (Framingham Risk Score, ASCVD risk models, XGBoost/LightGBM ensembles) with interactive 3D WebGL visualizations and live Google Maps Platform geolocation.

---

## 🏗️ Architecture & Data Flow

```
[ React 19 Frontend ] 
         │
         ▼ (JSON REST / WebSockets)
[ Express API Gateway (Port 5000) ]
         │
         ├──► [ FastAPI ML Microservice (Port 8000) ] ──► XGBoost & LightGBM Ensembles
         │
         ├──► [ PostgreSQL Database (Prisma ORM) ] ──► Encrypted Health Records
         │
         └──► [ Google Gemini AI Agent Orchestrator ] ──► Vector RAG & Clinical Consultation
```

### Centralized Single Source of Truth
All dashboard components subscribe to a centralized **Zustand Prediction Store** (`predictionStore.ts`). When a user executes a **Risk Scan**, every widget updates simultaneously in real time:
- **Risk Classification Gauge**: Smooth count-up score animation & needle rotation (-90° to +90°) with severity color transitions.
- **3D Digital Twin Heart**: Real-time anatomical heartbeat animation, color shifts, and pulse frequency matching patient heart rate and blood pressure.
- **Live ECG Waveform Monitor**: Continuously scrolling telemetry waveform dynamically adapting to Normal Sinus Rhythm, ST-T Abnormality, or LV Hypertrophy patterns.
- **Vitals & Biometrics**: Real-time rendering of Systolic/Diastolic BP, Cholesterol (LDL/HDL), Fasting Blood Sugar, and BMI Circular Gauges.
- **Explainable AI (SHAP)**: Feature contribution breakdown highlighting top clinical risk drivers.
- **Personalized Recommendations**: Dynamic diet, exercise, and medication plans matching the active risk profile.

---

## ✨ Key Features

### 1. 🫀 Interactive 3D Digital Heart Twin
- **WebGL Rendering**: Three.js GLTF model with real-time anatomical heartbeat animation.
- **Biometric Heatmaps**: Dynamic color coding based on blood pressure, ejection fraction, cholesterol, and arterial stress.
- **Chamber Inspection**: Inspect left ventricle, right atrium, coronary arteries, and heart valve parameters.

### 2. ⚡ AI Cardiovascular Risk Scan
- **Multi-Factor Assessment**: Evaluates age, Systolic/Diastolic BP, Fasting Blood Sugar, Resting ECG, Thallium Stress Test, Peak HR, and Lifestyle factors.
- **Ensemble ML Prediction**: Calculates Framingham 10-year CVD risk percentage, arterial age, and risk categories (Low, Moderate, High, Critical).
- **Fail-Safe Fallback**: Includes an embedded clinical fallback engine ensuring zero downtime even if the FastAPI microservice is offline.

### 3. 📍 Nearby Cardiac Care (Google Maps Platform)
- **Places API Integration**: Searches real, live cardiac hospitals, cardiologists, emergency ICUs, diagnostic labs, and pharmacies.
- **Bi-Directional Canvas Sync**: Custom SVG map markers synced with detailed facility cards.
- **Emergency SOS Banner**: Direct emergency routing to nearest 24/7 cardiac ICU.

### 4. 🤖 HridyaAI Multi-Agent Medical Assistant
- **Gemini-Powered AI Consultations**: Real-time conversational AI for ECG interpretation, symptom analysis, medication guidance, and diet plans.
- **Vector RAG Knowledge Base**: Clinical guidelines retrieved via semantic vector search.

### 5. 👨‍⚕️ Doctor & Admin Portals
- **Cardiologist Dashboard**: Patient triage queues, ECG waveform preview, EHR risk history, and tele-consultation requests.
- **Admin Analytics Portal**: Population-level cardiovascular metrics, risk distribution charts, regional emergency heatmaps, and system telemetry.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|-------|-------------------|
| **Frontend Core** | React 19, Vite 6, TypeScript 5, Zustand, Framer Motion |
| **Styling & UI** | TailwindCSS, Lucide Icons, Glassmorphic Design System |
| **3D & Visualizations** | Three.js WebGL, Recharts Data Visualization |
| **Maps & Geolocation** | Google Maps JavaScript API, Google Places API (New) v1, OpenStreetMap |
| **Backend Gateway** | Node.js, Express.js, PostgreSQL (Prisma ORM), WebSockets (`ws`), Winston |
| **AI ML Microservice** | Python 3.14, FastAPI, Uvicorn, XGBoost, Scikit-Learn, SHAP |
| **LLM & RAG** | Google Gemini API (`@google/genai`), pgvector |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **Python** v3.10+
- **Google Maps API Key** (with Places API and Maps JavaScript API enabled)
- **Google Gemini API Key**

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/AshishG66/Major-project.git
cd Major-project
```

---

### Step 2: Configure Environment Variables

1. **Frontend (`.env`)**:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   VITE_API_URL=http://localhost:5000/api
   ```

2. **Backend (`server/.env`)**:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hridyadarpan"
   JWT_SECRET=your_jwt_secret_key_here
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   AI_SERVICE_URL=http://localhost:8000
   ```

---

### Step 3: Install Dependencies & Run Services

#### 1. Backend Server:
```bash
cd server
npm install
npm run dev
```
*Runs at:* `http://localhost:5000`

#### 2. Python AI Service:
```bash
cd ai
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```
*Runs at:* `http://localhost:8000`

#### 3. Frontend Web App:
```bash
npm install
npm run dev
```
*Runs at:* `http://localhost:5173`

---

## 📜 Available Scripts

- `npm run dev` — Launch Vite local development server
- `npm run build` — Compile TypeScript and build production bundle
- `npm run preview` — Locally preview production build

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Ashish G** — [GitHub Repository](https://github.com/AshishG66/Major-project)
