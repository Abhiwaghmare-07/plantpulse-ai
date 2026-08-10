# 🏭 PlantPulse AI — Industrial Predictive Maintenance System

> **Real-time machine failure prediction powered by a trained Random Forest ML model, a dedicated Python microservice, live WebSocket updates, and a full React monitoring dashboard.**

PlantPulse AI is an end-to-end predictive maintenance platform built on the **AI4I 2020 Industrial Sensor Dataset**. It continuously monitors a fleet of industrial machines, processes their sensor readings through a trained ML pipeline, and surfaces failure predictions in real time — before a breakdown occurs. The project demonstrates a production-style architecture with a dedicated FastAPI ML microservice, an Express/MongoDB orchestration layer, Socket.io live updates, and a polished React dashboard — all wired together and running live.

---

## ✨ Key Features

- **Live Monitoring Dashboard** — 4-machine fleet grid with real-time status badges, sensor readings, failure probability, and predicted failure type; updates every 5 seconds via Socket.io without a page refresh
- **Machine Detail View** — per-machine trend charts (Tool Wear, Torque, RPM, Process Temperature) that extend live, plus a rule-based "Why this prediction?" explanation comparing current sensors against healthy operating ranges
- **Manual Prediction Test Panel** — submit arbitrary sensor values directly to the ML model to explore how individual parameters drive predictions; includes 3 pre-calibrated presets (Healthy / Warning / Critical) and a session history
- **IoT Simulator** — server-side simulator injects realistic sensor trajectories for 4 demo machines (Alpha/Beta = stable healthy, Gamma = degrading with auto-reset cycle for live demo, Delta = permanent critical), since physical hardware is not available
- **Graceful ML Degradation** — if the FastAPI service goes down, Express returns clean `503` responses with descriptive messages; the frontend shows an error state rather than crashing
- **Alert Feed** — real-time sidebar on the Dashboard logs every new alert as machines transition into Warning or Critical states
- **Responsive Design** — dark industrial theme using CSS custom properties; fully responsive across desktop, tablet, and mobile

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, React Router v7, Recharts, Socket.io-client, Vanilla CSS with design system |
| **Backend** | Node.js 18, Express 4, Socket.io 4 |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **ML Service** | Python 3.11, FastAPI, Uvicorn, scikit-learn, imbalanced-learn (SMOTE), XGBoost, joblib |
| **Real-time** | Socket.io (WebSocket + long-poll fallback) |
| **Data** | AI4I 2020 Predictive Maintenance Dataset (UCI ML Repository, 10 000 rows) |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (React)                           │
│  Dashboard ─── MachineDetail ─── ManualTest                      │
│      │               │                 │                         │
│   axios REST    socket.io-client    axios REST                    │
└──────┼───────────────┼─────────────────┼────────────────────────┘
       │               │ (WebSocket)      │
       ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express Server  (Node.js :5000)                    │
│                                                                 │
│  POST /api/readings ──► readingController                       │
│  GET  /api/machines     machineController  ──► MongoDB Atlas    │
│  GET  /api/alerts       alertController                         │
│  POST /api/predict/manual predictController                     │
│                          │                                      │
│  Socket.io ──────────────┤  emit "machine:update"               │
│                          │  emit "alert:new"                    │
│  Simulator (5s ticks) ───┘                                      │
│     SIM-ALPHA-01 (healthy)                                      │
│     SIM-BETA-02  (healthy)                                      │
│     SIM-GAMMA-03 (degrading → reset cycle)                      │
│     SIM-DELTA-04 (permanent critical)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ axios  POST /predict
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│           FastAPI ML Service  (Python :8000)                    │
│                                                                 │
│  POST /predict                                                  │
│    1. Preprocess with StandardScaler + OHE (preprocessor.pkl)  │
│    2. Binary classifier → failure_probability (failure_model)  │
│    3. If failure predicted → type classifier (failure_type_model│
│  GET  /health                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for a live reading:**
1. Simulator generates sensor values every 5 seconds per machine
2. Calls `POST /api/readings` on Express with raw sensor data
3. Express forwards to FastAPI `/predict`, gets failure probability + type
4. Express saves Reading + updates Machine document in MongoDB
5. If probability ≥ 60% → creates Alert document
6. Express emits `machine:update` (and `alert:new` if applicable) via Socket.io
7. React Dashboard receives the event and updates the card in-place — no polling, no refresh

---

## 📈 Model Performance

Both models are trained on the **AI4I 2020 Predictive Maintenance Dataset** and evaluated on a held-out 20% test set (no data leakage).

### Class Imbalance Handling

The dataset is severely imbalanced: only **~3.4% of samples** contain a machine failure. Naive classifiers would achieve 96.6% accuracy by always predicting "no failure" — which is useless for maintenance. To address this:

- **SMOTE** (Synthetic Minority Over-sampling Technique) from `imbalanced-learn` is applied **only to the training split**, never to the test set
- Recall is the primary evaluation metric — missing a real failure is far more costly than a false alarm

### Binary Failure Prediction (`failure_model.pkl` — Random Forest / XGBoost)

| Metric | Score |
|--------|-------|
| Accuracy | **98.00%** |
| Precision | 67.07% |
| Recall | **80.88%** |
| F1-Score | **73.33%** |

> Recall of 80.88% on an imbalanced dataset means the model catches ~4 out of every 5 real failures on completely unseen data.

### Multi-Class Failure Type Diagnostic (`failure_type_model.pkl`)

Trained only on confirmed-failure instances to diagnose which of 5 failure modes is occurring:

| Failure Type | Precision | Recall | F1 |
|---|---|---|---|
| Heat Dissipation Failure (HDF) | 85.19% | **100.0%** | 92.00% |
| Power Failure (PWF) | 94.74% | **100.0%** | 97.30% |
| Tool Wear Failure (TWF) | 85.71% | 66.67% | 75.00% |
| Overstrain Failure (OSF) | 76.92% | 62.50% | 68.97% |
| Other / Random Failure | **100.0%** | **100.0%** | **100.0%** |
| **Overall Accuracy** | | | **86.76%** |

---

## 📸 Screenshots

> *(Screenshots to be added — run the app locally to see the live interface)*

**Dashboard — Live Machine Fleet Overview**
![Dashboard showing 4 machine cards with real-time status badges and sensor readings](docs/screenshots/dashboard.png)

**Machine Detail — Live Sensor Trend Charts**
![Machine detail page with recharts line graphs for Tool Wear, Torque, RPM and Process Temperature](docs/screenshots/machine-detail.png)

**Manual Test Panel — Direct ML Model Access**
![Manual prediction test panel with sensor input form, preset buttons, and probability result bar](docs/screenshots/manual-test.png)

---

## 🚀 Local Setup

> You'll need: **Node.js ≥ 18**, **Python ≥ 3.9**, and a **MongoDB Atlas** cluster (free tier is fine).

### 1 · Clone the repository

```bash
git clone https://github.com/Abhiwaghmare-07/plantpulse-ai.git
cd plantpulse-ai
```

### 2 · Start the ML Service (FastAPI — Port 8000)

```bash
cd ml-service

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1          # Windows PowerShell
# source venv/bin/activate           # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --host 127.0.0.1 --port 8000
# API docs available at: http://127.0.0.1:8000/docs
```

No `.env` file is needed for the ML service.

### 3 · Start the Express Server (Port 5000)

```bash
cd server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env — set MONGO_URI to your MongoDB Atlas connection string

# Start the server (with simulator)
npm start
# or for development with auto-reload:
npm run dev
```

**Required `.env` variables:**
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/plantpulse
PORT=5000
ML_API_URL=http://localhost:8000
SIMULATOR_ENABLED=true
SIMULATOR_INTERVAL_MS=5000
```

### 4 · Start the React Frontend (Port 5173)

```bash
cd client

# Install dependencies
npm install

# Configure environment variables (optional — defaults point to localhost)
cp .env.example .env

# Start Vite dev server
npm run dev
# App available at: http://localhost:5173
```

**`.env` variables (optional):**
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 5 · Verify everything is running

| Service | URL | Expected |
|---------|-----|---------|
| FastAPI ML | http://localhost:8000/health | `{"status":"ok","models_loaded":true}` |
| Express API | http://localhost:5000/api/health | `{"status":"ok","mongodb":"connected"}` |
| React App | http://localhost:5173 | Live Dashboard |

---

## 📁 Project Structure

```
plantpulse-ai/
├── data/
│   └── ai4i2020.csv              ← Source dataset (UCI AI4I 2020)
│
├── ml-service/                   ← Python FastAPI ML microservice
│   ├── app/
│   │   ├── main.py               ← FastAPI app, endpoints
│   │   ├── predict.py            ← Preprocessing + inference logic
│   │   ├── model_loader.py       ← Loads .pkl files on startup
│   │   └── schemas.py            ← Pydantic request/response models
│   ├── models/                   ← Serialised trained models (.pkl)
│   ├── notebooks/                ← EDA + training notebooks
│   ├── outputs/                  ← Saved EDA plots
│   ├── requirements.txt
│   └── README.md
│
├── server/                       ← Node.js Express backend
│   └── src/
│       ├── controllers/          ← Business logic per resource
│       ├── models/               ← Mongoose schemas (Machine, Reading, Alert)
│       ├── routes/               ← Express route handlers
│       ├── simulator/            ← IoT data simulator
│       ├── socket/               ← Socket.io event emitters
│       ├── config/db.js          ← MongoDB Atlas connection
│       ├── app.js                ← Express app setup
│       └── server.js             ← HTTP server + Socket.io init
│
├── client/                       ← React frontend (Vite)
│   └── src/
│       ├── components/           ← Shared components (Navbar, AlertFeed, WhyExplanation)
│       ├── context/              ← SocketContext (global socket connection)
│       ├── pages/
│       │   ├── Dashboard/        ← Live fleet overview
│       │   ├── MachineDetail/    ← Per-machine charts + detail
│       │   └── ManualTest/       ← Direct ML model test panel
│       ├── services/             ← axios instance, socket client
│       ├── index.css             ← Global design system (CSS variables)
│       └── App.jsx               ← Router + layout
│
└── README.md                     ← This file
```

---

## 💡 What Makes This Project Different

Most portfolio ML projects call a third-party API (like OpenAI) and wrap it in a frontend. PlantPulse AI does not do that.

**1. A genuinely trained ML model, not an API wrapper.**
The Random Forest model was trained from scratch on 10 000 real sensor samples, with honest handling of the 97:3 class imbalance using SMOTE. The model metrics — 80.88% recall on unseen data — reflect real performance on a hard problem, not cherry-picked numbers.

**2. Production-style microservice architecture.**
The ML model runs in its own isolated FastAPI process with its own dependencies, just as it would in a production system where the data science and backend teams operate independently. The Express server talks to it over HTTP, fails gracefully when it's down, and never exposes the model directly to the client.

**3. Live real-time updates without polling.**
Socket.io pushes updates to every connected browser the moment a new reading is processed — the dashboard updates in-place every 5 seconds without a single page refresh or client-side timer.

**4. A working simulator that mimics real IoT behaviour.**
Without physical sensors, the server-side simulator generates realistic trajectories: stable machines with Gaussian noise, a degrading machine (Gamma) that transitions Healthy → Warning → Critical and auto-resets for repeatable demos, and a permanently critical machine (Delta) for always-visible failure state. This is a realistic stand-in for an actual MQTT/sensor feed.

**5. Full-stack traceability.**
Every sensor reading is stored in MongoDB. Every prediction is attached to a reading. Every alert is linked to a machine. The entire inference chain — sensor → prediction → alert → dashboard — is auditable end to end.
