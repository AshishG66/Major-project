# HRIDAYADARPANA (हृदय दर्पण) — PRODUCTION DEPLOYMENT GUIDE

This document provides the definitive guide for deploying HridayaDarpana to online cloud infrastructure so that the Android APK and web frontend operate 24/7 independently of any local development computer.

---

## 1. Production Architecture Overview

```
                      [ Android Native APK / Web App ]
                                     │
                                     ▼ (HTTPS / WSS)
                      [ Express Production Gateway ]
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
     [ Neon PostgreSQL ]     [ Gemini 2.5 Flash ]   [ FastAPI Microservice ]
   (Cloud Serverless DB)    (AI Clinical Consult)      (5 ML Models)
```

- **Target Public API URL**: `https://<your-api-domain>/api` (e.g. `https://hridayadarpana-api.onrender.com/api`)
- **Target FastAPI URL**: `https://<your-ai-domain>` (e.g. `https://hridayadarpana-ai.onrender.com`)
- **Database**: Cloud Serverless Neon PostgreSQL (AWS US-East-1 with SSL)
- **WebSockets**: Supported natively over `wss://<your-api-domain>/?token=<jwt>`

---

## 2. Option A: Deployment on Render.com (Recommended)

Render provides automatic SSL certificates, native WebSockets, background processes, and zero-maintenance operation.

### Step 1: Push Project to GitHub
Ensure your repository is pushed to GitHub.

### Step 2: Deploy via Blueprint (Fastest)
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Select your repository.
4. Render will read `render.yaml` and automatically configure:
   - **`hridayadarpana-ai`** (Python Web Service running FastAPI)
   - **`hridayadarpana-api`** (Node.js Web Service running Express)
5. Fill in the required environment variables in the prompt:
   - `DATABASE_URL`: Your Neon connection string.
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key.
6. Click **Apply**.

### Step 3: Manual Service Configuration (Alternative)
If setting up services manually on Render:
- **FastAPI Service**:
  - Root Directory: `ai`
  - Runtime: `Python 3`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
  - Environment Variables:
    - `PYTHON_VERSION`: `3.11.9`
    - `MODELS_DIR`: `models`
- **Express Service**:
  - Root Directory: `server`
  - Runtime: `Node`
  - Build Command: `npm install && npx prisma generate && npm run build`
  - Start Command: `node dist/server.js`
  - Environment Variables:
    - `NODE_ENV`: `production`
    - `DATABASE_URL`: `<neon-db-url>`
    - `JWT_SECRET`: `<secure-random-string>`
    - `REFRESH_SECRET`: `<secure-random-string>`
    - `GEMINI_API_KEY`: `<gemini-key>`
    - `GOOGLE_MAPS_API_KEY`: `<maps-key>`
    - `AI_SERVICE_URL`: `<url-of-fastapi-service>`

---

## 3. Option B: Deployment on Single VPS / Cloud Server

For deployment on DigitalOcean, AWS EC2, Hetzner, or Linode:

```bash
# 1. Clone repository to server
git clone <your-repo-url> /opt/hridayadarpana
cd /opt/hridayadarpana

# 2. Create production environment file (.env.server)
cat << 'EOF' > .env.server
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
JWT_SECRET=your_jwt_secret_here
REFRESH_SECRET=your_refresh_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
PUBLIC_DOMAIN=api.yourdomain.com
EOF

# 3. Launch with Docker Compose and Caddy (Automatic HTTPS)
docker compose -f docker-compose.prod.yml --env-file .env.server up -d --build
```

---

## 4. Required Environment Variables

### Server (Express Gateway)
| Variable | Description | Example / Note |
|---|---|---|
| `PORT` | Service port | Default: `5000` (cloud sets `$PORT`) |
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | Neon PostgreSQL connection URI | Must include `?sslmode=require` |
| `JWT_SECRET` | Secret key for signing access JWTs | 64+ character random hex string |
| `REFRESH_SECRET` | Secret key for signing refresh JWTs | 64+ character random hex string |
| `GEMINI_API_KEY` | Google Gemini API key | Never bundle on client |
| `GEMINI_MODEL` | Target Gemini model | `gemini-2.5-flash` |
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform API key | Places & Geocoding |
| `AI_SERVICE_URL` | URL of production FastAPI service | e.g. `https://hridayadarpana-ai.onrender.com` |
| `FRONTEND_URL` | Optional comma-separated web origins | e.g. `https://app.hridayadarpana.com` |

### AI Microservice (FastAPI)
| Variable | Description | Example / Note |
|---|---|---|
| `PORT` | Microservice port | Default: `8000` |
| `MODELS_DIR` | Directory containing `.joblib` models | `models` |
| `PYTHONUNBUFFERED` | Enable real-time logging | `1` |

### Frontend & Android Client
| Variable | Description | Production Value |
|---|---|---|
| `VITE_API_BASE_URL` | Public HTTPS API Gateway | `https://<your-api-domain>/api` |
| `VITE_GOOGLE_MAPS_API_KEY`| Client Google Maps JavaScript API Key | Client-restricted key |

---

## 5. Android Production APK Build Instructions

To generate the standalone production Android APK configured for public HTTPS backend services:

```bash
# 1. Ensure .env has the production URL
echo VITE_API_BASE_URL=https://<your-api-domain>/api > .env.production

# 2. Build production web bundle
npm run build

# 3. Synchronize assets with Android Capacitor project
npx cap sync android

# 4. Compile the release/standalone Android APK
cd android
./gradlew assembleDebug   # For universal testing APK
# or
./gradlew assembleRelease # For signed production release
```

The compiled APK will be located at:
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## 6. Verification and Health Checks

Once deployed, run these diagnostic checks:

### 1. Express Health Check
```bash
curl -i https://<your-api-domain>/api/health
```
**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "aiService": "online",
  "timestamp": "2026-..."
}
```

### 2. FastAPI Health Check
```bash
curl -i https://<your-ai-domain>/health
```
**Expected Response**:
```json
{
  "status": "healthy",
  "service": "HridyaDarpan AI Platform",
  "version": "3.0.0"
}
```

### 3. All 5 ML Models Check
```bash
curl -i https://<your-ai-domain>/model-status
```
**Expected Response**:
```json
{
  "status": "online",
  "loaded_models_count": 5,
  "loaded_models": ["framingham", "cardio", "heart_failure", "stroke", "ecg"]
}
```

---

## 7. Development vs Production Coexistence

Local development on your PC remains 100% operational:
- Run `npm run dev` in root: Frontend proxies `/api` to `http://localhost:5000`.
- Run `npm run dev` in `server`: Express runs on `http://localhost:5000`.
- Run Uvicorn in `ai`: FastAPI runs on `http://localhost:8000`.
- Mobile APK release builds compile with `VITE_API_BASE_URL` pointing to the public HTTPS domain, ensuring phones never depend on the local PC.

---

## 8. Troubleshooting

| Issue | Root Cause | Solution |
|---|---|---|
| `aiService: "offline"` in `/api/health` | `AI_SERVICE_URL` incorrect or FastAPI starting up | Verify `AI_SERVICE_URL` matches the FastAPI HTTPS domain without trailing slash. |
| DB Connection Timeout | Neon Cold Start or network policy | Ensure `DATABASE_URL` has `?sslmode=require&connect_timeout=30`. The backend includes an active keep-alive ping. |
| APK Shows Network Error | Phone not connected to internet or API domain down | Verify the public API URL resolves in mobile browser. Check phone internet connection. |
| WebSocket Disconnect | Proxy buffering | Ensure cloud provider or reverse proxy enables HTTP/1.1 Upgrade and WebSocket headers. |
