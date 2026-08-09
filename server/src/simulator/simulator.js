/**
 * simulator.js
 * Machine Degradation Simulator
 *
 * Mimics real IoT sensor data streaming since we don't have physical hardware.
 * Maintains 4 demo machines with distinct health trajectories and POSTs a new
 * sensor reading every SIMULATOR_INTERVAL_MS milliseconds by calling the
 * readingController logic directly (no HTTP round-trip).
 */

'use strict';

const Machine = require('../models/Machine');
const { createReading } = require('../controllers/readingController');

// ─── Simulator configuration ──────────────────────────────────────────────────

const INTERVAL_MS = parseInt(process.env.SIMULATOR_INTERVAL_MS || '5000', 10);

// Realistic baseline values drawn from the AI4I 2020 dataset distributions
const DEMO_MACHINES = [
  {
    machineId: 'SIM-ALPHA-01',
    name: 'Alpha Press Line',
    type: 'M',
    trajectory: 'healthy',
    baseline: { air_temperature: 300.2, process_temperature: 310.3, rotational_speed: 1502, torque: 40.1, tool_wear: 30 },
  },
  {
    machineId: 'SIM-BETA-02',
    name: 'Beta Milling Station',
    type: 'H',
    trajectory: 'healthy',
    baseline: { air_temperature: 299.8, process_temperature: 309.9, rotational_speed: 1498, torque: 38.5, tool_wear: 20 },
  },
  {
    machineId: 'SIM-GAMMA-03',
    name: 'Gamma Lathe Unit',
    type: 'M',
    trajectory: 'degrading',
    // Baseline starts slightly higher so Warning threshold is crossed within ~20-30 ticks
    baseline: { air_temperature: 301.5, process_temperature: 311.5, rotational_speed: 1475, torque: 46.0, tool_wear: 100 },
  },
  {
    machineId: 'SIM-DELTA-04',
    name: 'Delta Grinder',
    type: 'L',
    trajectory: 'critical',   // starts in warning, heads to critical
    baseline: { air_temperature: 302.0, process_temperature: 312.5, rotational_speed: 1390, torque: 58.0, tool_wear: 180 },
  },
];

// ─── In-memory state for each machine ─────────────────────────────────────────

const state = {};

function initState(cfg) {
  state[cfg.machineId] = { ...cfg.baseline };
}

// ─── Noise & drift helpers ─────────────────────────────────────────────────────

/** Gaussian-like noise in range [-range, +range] */
function jitter(range) {
  return (Math.random() * 2 - 1) * range;
}

/** Apply small random fluctuations — healthy machines stay near baseline */
function applyHealthyNoise(s) {
  return {
    air_temperature:     s.air_temperature     + jitter(0.4),
    process_temperature: s.process_temperature + jitter(0.3),
    rotational_speed:    s.rotational_speed     + jitter(8),
    torque:              s.torque               + jitter(1.0),
    tool_wear:           s.tool_wear            + jitter(0.5),   // minimal wear
  };
}

/** Apply steady degradation — tool_wear and torque climb each tick.
 *  Rates tuned so Gamma crosses Healthy→Warning→Critical in ~24-36 ticks (2-3 min).
 */
function applyDegradingDrift(s) {
  return {
    air_temperature:     s.air_temperature     + jitter(0.6),
    process_temperature: s.process_temperature + jitter(0.5) + 0.18, // thermal creep
    rotational_speed:    s.rotational_speed     + jitter(10)  - 3.5,  // RPM drop
    torque:              s.torque               + jitter(1.2) + 1.2,  // torque creep (2× faster)
    tool_wear:           s.tool_wear            + jitter(1.0) + 8,    // wear accumulates fast
  };
}

/** Apply aggressive degradation — already warning, heading to critical */
function applyCriticalDrift(s) {
  return {
    air_temperature:     s.air_temperature     + jitter(0.8),
    process_temperature: s.process_temperature + jitter(0.6) + 0.15,
    rotational_speed:    s.rotational_speed     + jitter(12)  - 3,
    torque:              s.torque               + jitter(1.5) + 1.2,
    tool_wear:           s.tool_wear            + jitter(1.5) + 6,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nextSensorValues(machineId, trajectory) {
  const s = state[machineId];
  let next;

  switch (trajectory) {
    case 'healthy':  next = applyHealthyNoise(s);    break;
    case 'degrading': next = applyDegradingDrift(s); break;
    case 'critical':  next = applyCriticalDrift(s);  break;
    default:         next = applyHealthyNoise(s);
  }

  // Clamp to realistic bounds from the dataset
  next.air_temperature     = clamp(next.air_temperature,     295, 315);
  next.process_temperature = clamp(next.process_temperature, 305, 325);
  next.rotational_speed    = clamp(next.rotational_speed,    1200, 1800);
  next.torque              = clamp(next.torque,              10,   95);
  next.tool_wear           = clamp(next.tool_wear,           0,    250);

  // Round to 1 decimal
  Object.keys(next).forEach(k => { next[k] = Math.round(next[k] * 10) / 10; });

  // Update in-memory state for next tick
  state[machineId] = next;

  return next;
}

// ─── Status colour helpers for terminal output ────────────────────────────────

const COLOURS = { Healthy: '\x1b[32m', Warning: '\x1b[33m', Critical: '\x1b[31m', reset: '\x1b[0m' };

function colourStatus(status) {
  return `${COLOURS[status] || ''}${status}${COLOURS.reset}`;
}

// ─── Core tick logic ──────────────────────────────────────────────────────────

let tickCount = 0;

async function tick() {
  tickCount++;
  const ts = new Date().toISOString().substring(11, 19); // HH:MM:SS

  console.log(`\n🤖 [Simulator] Tick #${tickCount}  ${ts}`);
  console.log(`${'─'.repeat(72)}`);

  for (const cfg of DEMO_MACHINES) {
    const sensors = nextSensorValues(cfg.machineId, cfg.trajectory);

    // Build a fake Express req/res to call the controller directly
    const body = {
      machineId:           cfg.machineId,
      air_temperature:     sensors.air_temperature,
      process_temperature: sensors.process_temperature,
      rotational_speed:    sensors.rotational_speed,
      torque:              sensors.torque,
      tool_wear:           sensors.tool_wear,
      type:                cfg.type,
    };

    let statusOut = 'Healthy';
    let probOut   = 0;
    let typeOut   = null;

    await new Promise((resolve) => {
      const req = { body };
      const res = {
        status(code) { this._code = code; return this; },
        json(data) {
          if (data && data.prediction) {
            statusOut = data.prediction.status;
            probOut   = data.prediction.failure_probability;
            typeOut   = data.prediction.predicted_failure_type;
          }
          resolve();
        },
      };
      createReading(req, res).catch((err) => {
        console.error(`  ⚠ [${cfg.machineId}] Controller error: ${err.message}`);
        resolve();
      });
    });

    console.log(
      `  ${cfg.machineId.padEnd(16)} ` +
      `tw=${String(sensors.tool_wear).padStart(5)} ` +
      `tq=${String(sensors.torque).padStart(5)} ` +
      `rpm=${String(sensors.rotational_speed).padStart(4)} ` +
      `prob=${(probOut * 100).toFixed(1).padStart(5)}%  ` +
      `→ ${colourStatus(statusOut)}${typeOut ? ` (${typeOut})` : ''}`
    );
  }
}

// ─── Ensure demo machines exist in DB ────────────────────────────────────────

async function ensureDemoMachines() {
  for (const cfg of DEMO_MACHINES) {
    initState(cfg);
    const existing = await Machine.findOne({ machineId: cfg.machineId });
    if (!existing) {
      await Machine.create({ machineId: cfg.machineId, name: cfg.name, type: cfg.type });
      console.log(`  ✅ Created demo machine: ${cfg.machineId} (${cfg.name})`);
    } else {
      console.log(`  ✔  Demo machine already exists: ${cfg.machineId}`);
    }
  }
}

// ─── Simulator lifecycle ──────────────────────────────────────────────────────

let _timer = null;
let _running = false;

async function startSimulator() {
  console.log('🤖 [Simulator] Ensuring 4 demo machines exist...');
  await ensureDemoMachines();

  console.log(`🤖 [Simulator] Starting — tick every ${INTERVAL_MS / 1000}s`);
  _running = true;

  // Run first tick immediately, then set interval
  await tick();
  _timer = setInterval(async () => {
    if (_running) await tick();
  }, INTERVAL_MS);
}

function stopSimulator() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  _running = false;
  console.log('🤖 [Simulator] Stopped.');
}

function getSimulatorStatus() {
  return {
    running: _running,
    intervalMs: INTERVAL_MS,
    tickCount,
    machines: DEMO_MACHINES.map((cfg) => ({
      machineId:  cfg.machineId,
      name:       cfg.name,
      type:       cfg.type,
      trajectory: cfg.trajectory,
      currentState: state[cfg.machineId] || null,
    })),
  };
}

module.exports = { startSimulator, stopSimulator, getSimulatorStatus };
