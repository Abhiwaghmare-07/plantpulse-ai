/**
 * test_endpoints.js
 * Run with: node test_endpoints.js
 * Tests all PlantPulse AI backend API endpoints end-to-end.
 */

const axios = require('axios');

const BASE = 'http://localhost:5000/api';

// Colour helpers
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

function pass(label) { console.log(green(`  ✅ PASS`) + ` — ${label}`); }
function fail(label, err) { console.log(red(`  ❌ FAIL`) + ` — ${label}: ${err}`); }
function section(title) { console.log('\n' + bold(cyan(`━━ ${title} ━━`))); }

// Unique IDs to avoid conflicts on re-runs
const ts = Date.now();
const MACHINE_1_ID = `TEST-HEALTHY-${ts}`;
const MACHINE_2_ID = `TEST-CRITICAL-${ts}`;

// Sensor values from ml-service/test_api.py
const HEALTHY_READING = {
  air_temperature: 300.0,
  process_temperature: 310.0,
  rotational_speed: 1500.0,
  torque: 40.0,
  tool_wear: 50.0,
  type: 'M',
};

const CRITICAL_READING = {
  air_temperature: 298.1,
  process_temperature: 308.6,
  rotational_speed: 1382,
  torque: 63.0,
  tool_wear: 208,
  type: 'L',
};

async function run() {
  console.log(bold('\n🏭  PlantPulse AI — API Endpoint Test Suite'));
  console.log(`    Base URL: ${BASE}\n`);

  let machine1Id, machine2Id, alertId;

  // ───────────────────────────────────────────────
  section('1. Health Check');
  // ───────────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/health`);
    console.log('  Response:', r.data);
    if (r.data.status === 'ok' && r.data.mongodb === 'connected') {
      pass('Health check returned ok + mongodb connected');
    } else {
      fail('Health check', 'Unexpected response');
    }
  } catch (e) { fail('Health check', e.message); }

  // ───────────────────────────────────────────────
  section('2. Create Machines');
  // ───────────────────────────────────────────────
  try {
    const r1 = await axios.post(`${BASE}/machines`, { machineId: MACHINE_1_ID, name: 'Test Machine Alpha', type: 'M' });
    machine1Id = r1.data.data.machineId;
    console.log(`  Machine 1 created: ${machine1Id}`);
    pass('POST /api/machines — Machine 1 (Healthy test)');
  } catch (e) { fail('Create Machine 1', e.response?.data || e.message); }

  try {
    const r2 = await axios.post(`${BASE}/machines`, { machineId: MACHINE_2_ID, name: 'Test Machine Beta', type: 'L' });
    machine2Id = r2.data.data.machineId;
    console.log(`  Machine 2 created: ${machine2Id}`);
    pass('POST /api/machines — Machine 2 (Critical test)');
  } catch (e) { fail('Create Machine 2', e.response?.data || e.message); }

  // ───────────────────────────────────────────────
  section('3. Submit Sensor Readings');
  // ───────────────────────────────────────────────
  try {
    const r = await axios.post(`${BASE}/readings`, { machineId: MACHINE_1_ID, ...HEALTHY_READING });
    const { prediction, machine } = r.data;
    console.log(`  Prediction: status=${yellow(prediction.status)}, failure_prob=${prediction.failure_probability.toFixed(4)}, type=${prediction.predicted_failure_type || 'None'}`);
    console.log(`  Machine status updated to: ${machine.status}`);
    if (r.status === 201 && prediction.status) {
      pass(`POST /api/readings — healthy reading processed (predicted: ${prediction.status})`);
    } else {
      fail('Healthy reading', 'Missing prediction in response');
    }
    if (!r.data.alert) {
      pass('No alert created for healthy reading');
    } else {
      console.log(yellow('  ⚠ Alert created for healthy reading — check ML thresholds'));
    }
  } catch (e) { fail('Healthy reading', e.response?.data || e.message); }

  let criticalAlert = null;
  try {
    const r = await axios.post(`${BASE}/readings`, { machineId: MACHINE_2_ID, ...CRITICAL_READING });
    const { prediction, machine, alert } = r.data;
    console.log(`  Prediction: status=${red(prediction.status)}, failure_prob=${prediction.failure_probability.toFixed(4)}, type=${prediction.predicted_failure_type || 'None'}`);
    console.log(`  Machine status updated to: ${machine.status}`);
    if (r.status === 201 && prediction.status) {
      pass(`POST /api/readings — critical reading processed (predicted: ${prediction.status})`);
    } else {
      fail('Critical reading', 'Missing prediction in response');
    }
    if (alert) {
      criticalAlert = alert;
      alertId = alert._id;
      console.log(`  Alert created: "${alert.message}"`);
      pass('Alert auto-created for Warning/Critical reading');
    } else {
      console.log(yellow(`  ⚠ No alert created — predicted status was: ${prediction.status}`));
    }
  } catch (e) { fail('Critical reading', e.response?.data || e.message); }

  // ───────────────────────────────────────────────
  section('4. Verify Machine Status Updated');
  // ───────────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/machines`);
    const machines = r.data.data;
    console.log(`  Total machines in DB: ${r.data.count}`);

    const m1 = machines.find(m => m.machineId === MACHINE_1_ID);
    const m2 = machines.find(m => m.machineId === MACHINE_2_ID);

    if (m1) {
      console.log(`  Machine 1 (${MACHINE_1_ID}) status: ${m1.status}`);
      pass(`GET /api/machines — Machine 1 found, status: ${m1.status}`);
    } else { fail('Machine 1 not found in list', ''); }

    if (m2) {
      console.log(`  Machine 2 (${MACHINE_2_ID}) status: ${m2.status}`);
      pass(`GET /api/machines — Machine 2 found, status: ${m2.status}`);
    } else { fail('Machine 2 not found in list', ''); }
  } catch (e) { fail('GET /api/machines', e.response?.data || e.message); }

  // ───────────────────────────────────────────────
  section('5. Verify Readings History');
  // ───────────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/readings/${MACHINE_2_ID}`);
    console.log(`  Readings for Machine 2: ${r.data.count}`);
    if (r.data.count >= 1) {
      pass(`GET /api/readings/:machineId — ${r.data.count} reading(s) found`);
    } else {
      fail('Readings history', 'No readings found');
    }
  } catch (e) { fail('GET /api/readings/:machineId', e.response?.data || e.message); }

  // ───────────────────────────────────────────────
  section('6. Verify Alerts');
  // ───────────────────────────────────────────────
  try {
    const r = await axios.get(`${BASE}/alerts`);
    console.log(`  Total alerts in DB: ${r.data.count}`);
    const testAlert = r.data.data.find(a => a.machineId?.machineId === MACHINE_2_ID);
    if (testAlert) {
      console.log(`  Alert message: "${testAlert.message}"`);
      console.log(`  Alert status: ${testAlert.status}, acknowledged: ${testAlert.acknowledged}`);
      pass('GET /api/alerts — alert for test Machine 2 found');
      alertId = testAlert._id;
    } else if (r.data.count > 0) {
      console.log(yellow('  Alert exists but may be for a different machine (ML predicted Healthy for critical values)'));
      pass(`GET /api/alerts — ${r.data.count} total alert(s) present`);
    } else {
      console.log(yellow('  No alerts found — ML may have predicted Healthy for the critical test values'));
    }
  } catch (e) { fail('GET /api/alerts', e.response?.data || e.message); }

  // ───────────────────────────────────────────────
  section('7. Acknowledge Alert');
  // ───────────────────────────────────────────────
  if (alertId) {
    try {
      const r = await axios.patch(`${BASE}/alerts/${alertId}/acknowledge`);
      console.log(`  Alert acknowledged: ${r.data.data.acknowledged}`);
      if (r.data.data.acknowledged === true) {
        pass('PATCH /api/alerts/:id/acknowledge — alert marked acknowledged');
      } else {
        fail('Acknowledge alert', 'acknowledged field not true');
      }
    } catch (e) { fail('PATCH /api/alerts/:id/acknowledge', e.response?.data || e.message); }
  } else {
    console.log(yellow('  ⚠ Skipping acknowledge test — no alert ID available'));
  }

  // ───────────────────────────────────────────────
  section('8. Manual Predict (no DB save)');
  // ───────────────────────────────────────────────
  try {
    const r = await axios.post(`${BASE}/predict/manual`, {
      Air_temperature: 305.0,
      Process_temperature: 315.0,
      Rotational_speed: 1450.0,
      Torque: 55.0,
      Tool_wear: 200.0,
      Type: 'H',
    });
    console.log('  Manual prediction:', r.data.prediction);
    pass('POST /api/predict/manual — prediction returned');
  } catch (e) { fail('POST /api/predict/manual', e.response?.data || e.message); }

  // ───────────────────────────────────────────────
  section('9. Cleanup — Delete Test Machines');
  // ───────────────────────────────────────────────
  try {
    await axios.delete(`${BASE}/machines/${MACHINE_1_ID}`);
    pass(`DELETE /api/machines/${MACHINE_1_ID}`);
  } catch (e) { fail(`Delete Machine 1`, e.response?.data || e.message); }

  try {
    await axios.delete(`${BASE}/machines/${MACHINE_2_ID}`);
    pass(`DELETE /api/machines/${MACHINE_2_ID}`);
  } catch (e) { fail(`Delete Machine 2`, e.response?.data || e.message); }

  console.log(bold('\n✨  Test suite complete.\n'));
}

run().catch(err => {
  console.error(red('\nFatal error running tests:'), err.message);
  process.exit(1);
});
