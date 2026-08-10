# ⚛️ PlantPulse AI — React Frontend

Vite + React SPA providing the real-time monitoring dashboard for the PlantPulse AI predictive maintenance system.

---

## Features

- **Dashboard** — live machine fleet grid; updates in-place via Socket.io
- **Machine Detail** — per-machine sensor trend charts (Recharts), live appending, rule-based failure explanation
- **Manual Test Panel** — submit arbitrary sensor values directly to the ML model; session history; preset buttons (Healthy / Warning / Critical)
- **Dark industrial design system** — CSS custom properties, JetBrains Mono for sensor values, Inter for UI text, responsive layout

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Express backend running on port 5000 (see `../server/README.md`)

---

## Setup

```bash
cd client

# Install dependencies
npm install

# Copy environment template (optional — defaults point to localhost)
cp .env.example .env

# Start the Vite dev server
npm run dev
# App available at: http://localhost:5173

# Build for production
npm run build
npm run preview
```

### Environment Variables

`.env` is optional — the app defaults to `http://localhost:5000` for both the REST API and Socket.io connection.

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

All environment variables **must** be prefixed with `VITE_` to be accessible in client-side code via `import.meta.env`.

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Live fleet overview — 4 machine cards + alert feed sidebar |
| `/machine/:machineId` | MachineDetail | Per-machine charts, live sensor history, failure explanation |
| `/manual-test` | ManualTest | Direct ML model test panel with form + session history |

---

## Real-time Architecture

The app maintains a **single global Socket.io connection** managed by `SocketContext`. Components subscribe to events using `useSocket()`:

```jsx
const { socket, isConnected } = useSocket();

useEffect(() => {
  if (!socket) return;
  socket.on('machine:update', handler);
  return () => socket.off('machine:update', handler);
}, [socket]);
```

The Navbar shows a live "connected" indicator driven by the same context.

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `react-router-dom` v7 | Client-side routing |
| `axios` | HTTP requests to Express API |
| `socket.io-client` | Real-time WebSocket connection |
| `recharts` | Sensor trend line charts in MachineDetail |

---

## Project Structure

```
client/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx                  ← Router + layout wrapper
│   ├── main.jsx                 ← React entry point
│   ├── index.css                ← Global design system (CSS variables, typography, animations)
│   ├── components/
│   │   ├── Navbar/              ← Top navigation + socket status indicator
│   │   ├── AlertFeed/           ← Real-time alert sidebar
│   │   └── WhyExplanation/      ← Shared rule-based failure explanation component
│   ├── context/
│   │   └── SocketContext.jsx    ← Global Socket.io connection provider
│   ├── pages/
│   │   ├── Dashboard/           ← Dashboard.jsx + MachineCard.jsx
│   │   ├── MachineDetail/       ← MachineDetail.jsx + SensorChart.jsx
│   │   └── ManualTest/          ← ManualTest.jsx
│   └── services/
│       ├── api.js               ← Axios instance with base URL + error interceptor
│       └── socket.js            ← Socket.io client factory
├── .env.example
├── index.html
├── package.json
└── vite.config.js (if present)
```

---

## Design System

All colours, spacing, typography, and border-radius values are defined as CSS custom properties in `src/index.css` under `:root`. Component CSS files reference these tokens — no inline styles, no ad-hoc values.

Key tokens:

```css
--bg-base, --bg-surface, --bg-elevated     /* background layers */
--accent, --accent-dim, --accent-hover     /* teal/blue brand colour */
--status-healthy, --status-warning, --status-critical
--font-sans (Inter), --font-mono (JetBrains Mono)
--space-1 … --space-16                     /* 4px-based spacing scale */
```
