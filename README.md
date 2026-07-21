# HridyaDarpan (हृदय दर्पण) 🫀
> **AI-Powered Cardiovascular Risk Assessment, 3D Digital Heart Twin, & Nearby Cardiac Care Platform**

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Project Overview

**HridyaDarpan** (Hindi: *Mirror of the Heart*) is a state-of-the-art AI-driven cardiovascular health SaaS platform designed for early risk prediction, real-time physiological modeling via 3D Digital Twin, multi-agent AI consultations, and instant location-based emergency cardiac care matching.

Built for patients, cardiologists, and healthcare administrators, HridyaDarpan combines clinical predictive algorithms (Framingham Risk Score, ASCVD risk models, Random Forest ensembles) with interactive 3D WebGL visualizations and live Google Maps Platform geolocation.

---

## ✨ Key Features

### 1. 🫀 Interactive 3D Digital Heart Twin
- **WebGL Rendering**: Powered by Three.js with real-time anatomical heartbeat animation.
- **Biometric Heatmaps**: Dynamic color coding based on blood pressure, ejection fraction, cholesterol, and arterial stress.
- **Interactive Chamber Inspection**: Inspect left ventricle, right atrium, coronary arteries, and heart valve parameters.

### 2. ⚡ AI Cardiovascular Risk Wizard
- **Multi-Factor Assessment**: Evaluates age, Systolic/Diastolic BP, Fasting Blood Sugar, Resting ECG, Thallium Stress Test, Peak HR, and Lifestyle factors.
- **Ensemble ML Prediction**: Calculates Framingham 10-year CVD risk percentage, arterial age, and risk categories (Low, Moderate, High, Critical).
- **Personalized Lifestyle Roadmap**: AI-generated dietary recommendations, exercise frequency, and medication checkups.

### 3. 📍 Nearby Cardiac Care (Google Maps Platform)
- **Places API (New) v1 Integration**: Searches real, live cardiac hospitals, cardiologists, emergency ICUs, diagnostic labs, and pharmacies.
- **Bi-Directional Canvas Sync**: Interactive custom SVG map markers synced with detailed facility cards.
- **HridyaAI Recommended Match**: AI ranks top cardiac providers based on proximity, 24/7 ICU availability, and patient ratings.
- **Emergency SOS Alert**: One-click emergency banner identifying nearest 24/7 cardiac ICU with instant turn-by-turn navigation and direct phone dialer.
- **Real-Time Geocoding**: Powered by OpenStreetMap Nominatim and Google Geocoding for any city or pincode worldwide.

### 4. 🤖 HridyaAI Multi-Agent Medical Assistant
- **Gemini-Powered AI Consultations**: Real-time conversational AI for ECG interpretation, symptom analysis, medication guidance, and diet plans.
- **WebSocket Streaming**: Low-latency bidirectionally streamed medical chats.

### 5. 👨‍⚕️ Doctor & Admin Portals
- **Cardiologist Dashboard**: Patient triage queues, ECG waveform preview, EHR risk history, and tele-consultation requests.
- **Admin Analytics Portal**: Population-level cardiovascular metrics, risk distribution charts, regional emergency heatmaps, and system telemetry.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|-------|-------------------|
| **Frontend Core** | React 18, Vite 6, TypeScript 5 |
| **Styling & UI** | TailwindCSS, Lucide Icons, Glassmorphism Design System |
| **3D & Visualizations** | Three.js WebGL, Recharts Data Visualization |
| **Maps & Geolocation** | Google Maps JavaScript API, Google Places API (New) v1, OpenStreetMap |
| **Backend Gateway** | Node.js, Express.js, WebSockets (`ws`), CORS, Helmet |
| **AI Integration** | Google Gemini API (`@google/genai`), Multi-Agent Orchestration |

---

## 📁 Repository Structure

```
HridyaDarpana/
├── .env.example                # Environment variables template for frontend
├── index.html                  # HTML entry point
├── package.json                # Frontend dependencies and build scripts
├── src/                        # React Frontend Application
│   ├── components/             # Reusable UI Components
│   │   ├── Header.tsx          # Navigation Header with Dark Mode & Demo Toggle
│   │   ├── Nearby/             # Nearby Cardiac Care Components
│   │   │   ├── AiRecommendationCard.tsx
│   │   │   ├── ApiKeyNotice.tsx
│   │   │   ├── DoctorCard.tsx
│   │   │   ├── DoctorFilters.tsx
│   │   │   ├── EmergencyBanner.tsx
│   │   │   ├── NearbyMap.tsx
│   │   │   └── SearchBar.tsx
│   │   └── ThreeHeart/         # Three.js 3D Heart Twin Component
│   ├── pages/                  # Top-level Page Views
│   │   ├── LandingPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── PredictionWizardPage.tsx
│   │   ├── NearbyPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── DoctorPortalPage.tsx
│   │   └── AdminPortalPage.tsx
│   ├── services/               # API Clients & Service Handlers
│   │   ├── api.ts              # Axios/Fetch HTTP Client with Demo Mode Interceptor
│   │   └── googleMapsService.ts# Google Places API (New) & Geocoding Service
│   └── utils/                  # Utility Functions & Demo Data Generators
└── server/                     # Express Backend REST API & WebSocket Server
    ├── .env.example            # Environment variables template for server
    ├── package.json            # Backend dependencies
    └── src/
        ├── server.ts           # Entry point for Node/Express server
        ├── maps/               # Server-side Google Places API Proxy Controller
        ├── chat/               # Gemini AI Chat Controller
        └── config/             # Environment & Logger configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Google Maps API Key** (with Places API (New) and Maps JavaScript API enabled)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/AshishG66/Major-project.git
cd Major-project
```

---

### Step 2: Configure Environment Variables

1. **Frontend Configuration (`.env`)**:
   Create a `.env` file in the root directory:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   VITE_API_URL=http://localhost:5000/api
   ```

2. **Backend Configuration (`server/.env`)**:
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key_here
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

### Step 3: Install Dependencies

1. **Frontend**:
   ```bash
   npm install
   ```

2. **Backend Server**:
   ```bash
   cd server
   npm install
   cd ..
   ```

---

### Step 4: Run Development Servers

1. **Start Backend API Server**:
   ```bash
   cd server
   npm run dev
   ```
   *Server will run at:* `http://localhost:5000`

2. **Start Frontend Web App** (in a new terminal):
   ```bash
   npm run dev
   ```
   *Application will run at:* `http://localhost:5173`

---

## 📜 Available Scripts

- `npm run dev` — Launch Vite local development server
- `npm run build` — Compile TypeScript and build production bundle
- `npm run preview` — Locally preview production build
- `npm run lint` — Execute ESLint static analysis

---

## 🔒 Security & Privacy Notice

HridyaDarpan strictly enforces data protection standards:
- **No Hardcoded Keys**: All API keys and secrets are loaded dynamically from environment variables.
- **HIPAA/GDPR Alignment**: Medical metrics are sanitized and encrypted during transit.
- **Zero Fabricated Healthcare Data**: Real Google Places Platform and OpenStreetMap nodes are queried for healthcare provider matching.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
