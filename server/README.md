# 🌐 PlantPulse AI — Express Backend

Node.js + Express REST API and Socket.io real-time server for the PlantPulse AI predictive maintenance system.

---

## Responsibilities

- Expose REST endpoints for machines, readings, alerts, and manual prediction
- Orchestrate the ML pipeline: receive sensor readings → call FastAPI `/predict` → persist results to MongoDB Atlas
- Emit real-time Socket.io events (`machine:update`, `alert:new`) to connected React clients
- Run the built-in IoT simulator that generates realistic sensor trajectories for 4 demo machines

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A running MongoDB Atlas cluster (free tier works)
- FastAPI ML service running on port 8000 (see `../ml-service/README.md`)

---

## Setup

```bash
cd server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your actual values (see below)

# Start the server
npm start         # production
npm run dev       # development (nodemon auto-reload)
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# MongoDB Atlas connection string (required)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxxxx.mongodb.net/plantpulse?retryWrites=true&w=majority

# Server port
PORT=5000

# FastAPI ML service URL
ML_API_URL=http://localhost:8000

# Simulator — set to false to disable on startup
SIMULATOR_ENABLED=true

# Simulator tick interval in milliseconds (5000 = 5 seconds)
SIMULATOR_INTERVAL_MS=5000
```

---

## API Reference

### Health

```
GET /api/health
```
Returns server and MongoDB Atlas connection status.

### Machines

```
POST   /api/machines              Create a machine
GET    /api/machines              List all machines (with current status + last reading)
GET    /api/machines/:machineId   Get a single machine
DELETE /api/machines/:machineId   Delete a machine
```

### Readings

```
POST /api/readings                Submit a sensor reading (triggers ML prediction + socket emit)
GET  /api/readings/:machineId     Get last 50 readings for a machine (newest first)
```

### Alerts

```
GET /api/alerts                   Get last 50 alerts across all machines
```

### Predictions (Manual / No-persist)

```
POST /api/predict/manual          Submit raw sensor values, get ML prediction, nothing saved to DB
```

Request body:
```json
{
  "Air_temperature": 298.0,
  "Process_temperature": 308.0,
  "Rotational_speed": 1500,
  "Torque": 40.0,
  "Tool_wear": 50,
  "Type": "M"
}
```

### Simulator Control

```
GET  /api/simulator/status        Check simulator state
POST /api/simulator/start         Start the simulator
POST /api/simulator/stop          Stop the simulator
```

---

## Socket.io Events

All events are broadcast globally (no auth, no rooms needed for local demo).

| Event | Payload |
|-------|---------|
| `machine:update` | `{ machineId, status, lastReading, lastUpdated, prediction }` |
| `alert:new` | `{ machineId, status, message, timestamp }` |

---

## MongoDB Models

| Model | Key Fields |
|-------|-----------|
| `Machine` | `machineId`, `name`, `type`, `status`, `lastReading`, `lastUpdated`, `prediction` |
| `Reading` | `machineId`, `air_temperature`, `process_temperature`, `rotational_speed`, `torque`, `tool_wear`, `failure_probability`, `predicted_failure_type`, `status`, `timestamp` |
| `Alert` | `machineId`, `status`, `message`, `timestamp` |

---

## Project Structure

```
server/
├── src/
│   ├── app.js                  ← Express app (middleware, routes, error handlers)
│   ├── server.js               ← HTTP server + Socket.io attach + DB connect + simulator init
│   ├── config/
│   │   └── db.js               ← MongoDB Atlas connection via Mongoose
│   ├── controllers/
│   │   ├── machineController.js
│   │   ├── readingController.js ← Core: ML call + save + socket emit
│   │   ├── alertController.js
│   │   └── predictController.js ← Manual predict (no DB write)
│   ├── models/
│   │   ├── Machine.js
│   │   ├── Reading.js
│   │   └── Alert.js
│   ├── routes/
│   │   ├── machineRoutes.js
│   │   ├── readingRoutes.js
│   │   ├── alertRoutes.js
│   │   ├── predictRoutes.js
│   │   └── simulatorRoutes.js
│   ├── simulator/
│   │   └── simulator.js        ← 4-machine IoT simulator with status transitions
│   └── socket/
│       └── socketHandler.js    ← Socket.io event emitter helpers
├── .env.example
├── package.json
└── README.md
```
