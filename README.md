# JanSetu AI — Connecting Citizens. Improving Communities.

JanSetu AI is an independent civic-tech community intelligence platform designed to help citizens report local municipal problems in their own language, identify recurring community-wide issues through clustering, and provide advisory authority recommendations for human administrator review.

> **Disclaimer:** JanSetu AI is an independent community intelligence platform and is **not** an official government grievance portal. It does not claim live government integration or automated official complaint dispatch. All status transitions and authority assignments require explicit human administrator approval.

---

## Architecture Overview

| Service | Directory | Stack | Default Port |
|---|---|---|---|
| **Frontend** | `frontend/` | React 19, Vite 8, Tailwind CSS v4, Recharts, Lucide React | `5173` |
| **Backend API** | `backend/` | Node.js 20+, Express 5, Mongoose 9, MongoDB Atlas, Zod, JWT, bcryptjs | `5000` |
| **AI Intelligence Service** | `ai-service/` | Python 3.12+, FastAPI, Uvicorn, LangGraph, Rule/Lexicon Engine, Optional Ollama | `8000` |

### Reference Architecture Documentation
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) — Complete REST & internal AI API specifications.
- [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) — MongoDB collections, indexes, and security model.
- [`docs/AI_WORKFLOW.md`](docs/AI_WORKFLOW.md) — 10-stage LangGraph pipeline, hardware profile, and fallback strategy.

---

## Prerequisites

- **Node.js:** v20.x or newer (`npm` included)
- **Python:** v3.11+ (with `ai-service/.venv` virtual environment)
- **MongoDB Atlas:** Active cluster connection string (`MONGODB_URI`)
- **Ollama (Optional):** Only lightweight quantized models (e.g., `qwen2.5:0.5b`, `llama3.2:1b-instruct-q4_K_M`) are recommended on 2 GB VRAM GPUs. The deterministic rule-based engine runs standalone with **0 MB VRAM** by default (`ENABLE_OLLAMA=false`).

---

## Environment Configuration

Ensure `.env` files remain excluded by `.gitignore` (never commit real secrets). Copy the `.example` templates and configure strong local secrets:

### 1. Backend (`backend/.env`)
Template: [`backend/.env.example`](backend/.env.example)

| Variable | Description |
|---|---|
| `PORT` | Backend HTTP port (`5000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB Atlas connection URI targeting `community_development` |
| `JWT_SECRET` | Strong random secret (min 32 characters) for signing admin JWTs |
| `JWT_EXPIRES_IN` | Token expiry duration (e.g. `24h`) |
| `AI_SERVICE_URL` | Internal FastAPI base URL (`http://localhost:8000`) |
| `AI_SERVICE_INTERNAL_SECRET` | Shared secret matching `ai-service/.env` (`X-Internal-Secret`) |
| `FRONTEND_URL` | Allowed CORS origin (`http://localhost:5173`) |
| `SEED_ADMIN_EMAIL` | (Dev only) Initial seeded administrator email |
| `SEED_ADMIN_PASSWORD` | (Dev only) Initial seeded administrator password |

### 2. AI Service (`ai-service/.env`)
Template: [`ai-service/.env.example`](ai-service/.env.example)

| Variable | Description |
|---|---|
| `HOST` | Bind host (`127.0.0.1`) |
| `PORT` | FastAPI port (`8000`) |
| `ENABLE_OLLAMA` | `false` (default Tier 1 Rule Engine) or `true` (optional lightweight Ollama) |
| `OLLAMA_BASE_URL` | Local Ollama endpoint (`http://localhost:11434`) |
| `OLLAMA_MODEL` | Lightweight model tag (`qwen2.5:0.5b`) |
| `BACKEND_URL` | Node.js backend origin (`http://localhost:5000`) |
| `AI_SERVICE_INTERNAL_SECRET` | Must match `backend/.env` |

### 3. Frontend (`frontend/.env`)
Template: [`frontend/.env.example`](frontend/.env.example)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (`http://localhost:5000/api/v1`) |

---

## Local Setup & Running All Services (Windows PowerShell)

### Step 1: Install Dependencies
```powershell
cd backend; npm install
cd ..\frontend; npm install
cd ..\ai-service; .\.venv\Scripts\pip install -r requirements.txt
```

### Step 2: Seed Initial Development Data (Authorities, Clusters, Dev Admin & Sample Reports)
> **Note:** Seeding is restricted to `NODE_ENV !== 'production'` and is idempotent.
```powershell
cd backend
npm run seed
```

### Step 3: Start All Three Services (in three separate PowerShell terminals)

**Terminal 1 — Python FastAPI AI Service (`:8000`):**
```powershell
cd ai-service
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Node.js Express Backend (`:5000`):**
```powershell
cd backend
npm run dev
```

**Terminal 3 — React Vite Frontend (`:5173`):**
```powershell
cd frontend
npm run dev
```

### Step 4: Verify Application Locally
- **Citizen Portal:** `http://localhost:5173/`
- **Admin Login Portal:** `http://localhost:5173/admin/login`
- **Backend Health:** `http://127.0.0.1:5000/api/v1/health`
- **AI Service Health:** `http://127.0.0.1:8000/api/v1/ai/health`

---

## Running Automated Tests & Quality Checks

### Backend Tests (Vitest + Supertest)
```powershell
cd backend
npm test
```
To include the real MongoDB Atlas persistence smoke test (uses an isolated `community_development_test` DB and drops it cleanly afterwards):
```powershell
cd backend
$env:RUN_ATLAS_TESTS="true"; npm test; Remove-Item Env:RUN_ATLAS_TESTS
```

### Python AI Service Tests (pytest + FastAPI TestClient)
```powershell
cd ai-service
.\.venv\Scripts\python.exe -m pytest -v
```

### Frontend Lint, Tests & Production Build
```powershell
cd frontend
npm run lint; npm test; npm run build
```

---

## Troubleshooting

1. **MongoDB Atlas SRV / Connection Refused:**
   - Ensure your current IP address is whitelisted in MongoDB Atlas Network Access and outbound DNS/TLS (port `27017`) is permitted.
2. **AI Service Unreachable:**
   - If FastAPI on `:8000` is stopped, the Node.js backend automatically engages its `backend-degraded-fallback` classifier so citizen reports are never lost. Verify `AI_SERVICE_INTERNAL_SECRET` matches identically in `backend/.env` and `ai-service/.env`.
3. **PowerShell Command Chaining:**
   - On Windows PowerShell 5.1, use `;` rather than `&&` between sequential commands.
4. **Low VRAM Laptops (e.g., NVIDIA MX250 2 GB):**
   - Keep `ENABLE_OLLAMA=false` in `ai-service/.env` to use the zero-VRAM deterministic rule-based and multilingual lexicon engine (`< 25ms` per complaint).
