# ⚡ PlantPulse AI — Predictive Maintenance Platform

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![Node.js](https://img.shields.io/badge/Node.js-v20-green)
![Express](https://img.shields.io/badge/Express-4.21-000000)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)
![React](https://img.shields.io/badge/React-18-61DAFB)

PlantPulse AI is an enterprise-grade, full-stack predictive maintenance system designed for industrial IoT equipment monitoring. By analyzing real-time sensor telemetry (temperature, rotational speed, torque, tool wear), the system predicts equipment failure probabilities, classifies failure root causes (Heat Dissipation, Power, Tool Wear, Overstrain), and alerts plant engineers before costly downtime occurs.

---

## 🏗️ System Architecture

PlantPulse AI operates as a modern monorepo with decoupled microservices communicating over REST APIs:

```
                  ┌─────────────────────────────────────┐
                  │          React Dashboard            │
                  │    (Vite / Tailwind / Chart.js)     │
                  └──────────────────┬──────────────────┘
                                     │
                             HTTP / REST (Port 5173/3000 -> 5000)
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │       Node.js / Express Backend     │
                  │   (REST Controller, Health Probe)   │
                  └──────────┬──────────────────┬───────┘
                             │                  │
           Mongoose / TLS    │                  │  HTTP / REST (Port 8000)
       (mongodb+srv://)      │                  │  (Predict & Diagnoses)
                             ▼                  ▼
              ┌────────────────────┐   ┌───────────────────────────┐
              │   MongoDB Atlas    │   │   Python FastAPI Service  │
              │  (Cloud Database)  │   │  (XGBoost / Scikit-Learn) │
              └────────────────────┘   └───────────────────────────┘
```

### Architecture Breakdown:
- **Client (Frontend)**: React Single Page Application providing interactive telemetry dashboards, failure risk metrics, and alert management.
- **Server (Backend API)**: Node.js + Express REST API managing equipment entities (`Machine`), historical telemetry series (`Reading`), and failure notifications (`Alert`).
- **ML Microservice**: Python FastAPI service exposing endpoints for real-time failure prediction (`/predict`) and model health status (`/health`).
- **Database**: **MongoDB Atlas** cloud database storing persistent time-series telemetry and machine metadata.

---

## 🛠️ Technology Stack

| Domain | Technology | Description |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | High-performance dashboard & visualization UI |
| **Backend API** | Node.js, Express.js, Morgan, CORS | RESTful API server & orchestration |
| **Database** | MongoDB Atlas, Mongoose ODM | Cloud document storage & indexing |
| **Machine Learning** | Python 3, FastAPI, XGBoost, Scikit-Learn, SMOTE, Joblib | Binary failure prediction & multi-class root cause analysis |
| **Data Science** | Pandas, NumPy, Matplotlib, Seaborn, Jupyter | Exploratory Data Analysis (EDA) & preprocessing |

---

## 📁 Repository Structure

```
plantpulse-ai/
├── client/             (React frontend application)
├── server/             (Node.js + Express API backend)
│   ├── src/
│   │   ├── config/     (Database configuration)
│   │   ├── models/     (Mongoose schemas: Machine, Reading, Alert)
│   │   ├── routes/     (API route declarations)
│   │   ├── controllers/(Request controllers)
│   │   ├── app.js      (Express app & middleware setup)
│   │   └── server.js   (Server entrypoint)
│   ├── .env.example
│   └── package.json
├── ml-service/         (Python FastAPI microservice)
│   ├── app/            (FastAPI application & model inference logic)
│   ├── models/         (Serialized XGBoost & preprocessor .pkl models)
│   ├── notebooks/      (Jupyter EDA & Model Training notebooks)
│   ├── requirements.txt
│   └── README.md
├── data/               (AI4I 2020 Predictive Maintenance Dataset)
└── README.md           (System documentation)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ and `npm`
- **Python**: 3.9+ and `pip`
- **MongoDB Atlas Account**: A free-tier MongoDB Atlas cluster is required (local MongoDB instance is not used).

---

### 1 · ML Microservice Setup (Python / FastAPI)

```bash
# Navigate to ML service directory
cd ml-service

# Create and activate Python virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server (Port 8000)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Swagger API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

### 2 · Backend Server Setup (Node.js / Express / MongoDB Atlas)

> 📌 **Note**: PlantPulse AI uses **MongoDB Atlas** (cloud database). Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and copy your `mongodb+srv://` connection string.

```bash
# Navigate to server directory
cd server

# Install Node dependencies
npm install

# Configure Environment Variables
cp .env.example .env
```

Edit `server/.env` and replace `MONGO_URI` with your MongoDB Atlas connection string:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxxxx.mongodb.net/plantpulse?retryWrites=true&w=majority
PORT=5000
ML_API_URL=http://localhost:8000
```

Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```
- Health Check: `http://localhost:5000/api/health`

---

### 3 · Client Setup (React)

```bash
# Navigate to client directory
cd client

# Install dependencies and start dev server
npm install
npm run dev
```

---

## 📊 Dataset & Model Performance

The machine learning models are trained on the **AI4I 2020 Predictive Maintenance Dataset** (10,000 samples, 14 features):
- **Binary Failure Classifier (XGBoost + SMOTE)**:
  - **Accuracy**: 98.00%
  - **Precision**: 67.07%
  - **Recall**: 80.88%
  - **F1-Score**: 73.33%
- **Multi-Class Root Cause Diagnostic (XGBoost)**:
  - **Overall Accuracy**: 86.76%
  - Identifies Heat Dissipation Failure (HDF), Power Failure (PWF), Overstrain Failure (OSF), and Tool Wear Failure (TWF).

---

## 📡 API Reference

All Express API endpoints are prefixed with `/api` and served on **port 5000**.

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server + MongoDB Atlas liveness probe |

### Machines

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/machines` | Register a new machine (`machineId`, `name`, `type`) |
| `GET` | `/api/machines` | List all machines with current status and last reading |
| `GET` | `/api/machines/:machineId` | Get single machine details |
| `DELETE` | `/api/machines/:machineId` | Remove a machine (admin/testing) |

### Readings (Sensor Telemetry)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/readings` | Submit a sensor reading — calls ML service, saves result, updates machine status, auto-creates alert if Warning/Critical |
| `GET` | `/api/readings/:machineId` | Fetch last 50 readings for a machine (sorted newest first) |

**POST `/api/readings` request body:**
```json
{
  "machineId": "MACHINE-001",
  "air_temperature": 300.0,
  "process_temperature": 310.0,
  "rotational_speed": 1500.0,
  "torque": 40.0,
  "tool_wear": 50.0,
  "type": "M"
}
```

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alerts` | List all alerts sorted newest first |
| `GET` | `/api/alerts?acknowledged=false` | Filter to unacknowledged alerts only |
| `PATCH` | `/api/alerts/:id/acknowledge` | Mark an alert as acknowledged |

### Manual Prediction (Test Panel)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predict/manual` | Run prediction on raw sensor values without saving to DB |

**POST `/api/predict/manual` request body:**
```json
{
  "Air_temperature": 300.0,
  "Process_temperature": 310.0,
  "Rotational_speed": 1500.0,
  "Torque": 40.0,
  "Tool_wear": 50.0,
  "Type": "M"
}
```

**Prediction response shape:**
```json
{
  "status": "Healthy | Warning | Critical",
  "failure_probability": 0.12,
  "predicted_failure_type": "HDF | PWF | OSF | TWF | null",
  "confidence": 0.87
}
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

