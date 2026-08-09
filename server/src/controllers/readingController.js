const axios = require('axios');
const Machine = require('../models/Machine');
const Reading = require('../models/Reading');
const Alert = require('../models/Alert');
const socketHandler = require('../socket/socketHandler');

// Failure type → human-readable message map
const FAILURE_MESSAGES = {
  TWF:     'Tool Wear Failure',
  HDF:     'Heat Dissipation Failure',
  PWF:     'Power Failure',
  OSF:     'Overstrain Failure',
  RNF:     'Random Failure',
  Healthy: 'No failure predicted',
};

function buildAlertMessage(machineName, failureType, probability) {
  const label = FAILURE_MESSAGES[failureType] || failureType;
  const pct = (probability * 100).toFixed(1);
  return `Machine "${machineName}" showing signs of ${label} (${pct}% failure probability) — recommend inspection.`;
}

// POST /api/readings
const createReading = async (req, res) => {
  try {
    const {
      machineId: machineIdStr,
      air_temperature,
      process_temperature,
      rotational_speed,
      torque,
      tool_wear,
      type,
    } = req.body;

    // --- Input validation ---
    const required = { machineId: machineIdStr, air_temperature, process_temperature, rotational_speed, torque, tool_wear, type };
    for (const [field, val] of Object.entries(required)) {
      if (val === undefined || val === null || val === '') {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    const numericFields = { air_temperature, process_temperature, rotational_speed, torque, tool_wear };
    for (const [field, val] of Object.entries(numericFields)) {
      if (typeof val !== 'number' || isNaN(val)) {
        return res.status(400).json({ error: `Field "${field}" must be a number.` });
      }
    }
    if (!['L', 'M', 'H'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: L, M, H.' });
    }

    // --- Find machine ---
    const machine = await Machine.findOne({ machineId: machineIdStr });
    if (!machine) {
      return res.status(404).json({ error: `Machine "${machineIdStr}" not found. Register it first via POST /api/machines.` });
    }

    // --- Call FastAPI ML service ---
    let prediction;
    try {
      const mlUrl = `${process.env.ML_API_URL || 'http://localhost:8000'}/predict`;
      const mlPayload = {
        Air_temperature: air_temperature,
        Process_temperature: process_temperature,
        Rotational_speed: rotational_speed,
        Torque: torque,
        Tool_wear: tool_wear,
        Type: type,
      };
      const mlRes = await axios.post(mlUrl, mlPayload, { timeout: 10000 });
      prediction = mlRes.data;
    } catch (mlErr) {
      const isTimeout = mlErr.code === 'ECONNABORTED' || mlErr.code === 'ETIMEDOUT';
      const isDown = mlErr.code === 'ECONNREFUSED';
      console.error('ML service error:', mlErr.message);
      return res.status(503).json({
        error: 'ML service unavailable',
        details: isTimeout ? 'Request timed out' : isDown ? 'Connection refused — is the ML service running?' : mlErr.message,
      });
    }

    // --- Save Reading to DB ---
    const reading = await Reading.create({
      machineId: machine._id,
      air_temperature,
      process_temperature,
      rotational_speed,
      torque,
      tool_wear,
      failure_probability: prediction.failure_probability,
      predicted_failure_type: prediction.predicted_failure_type || null,
      status: prediction.status,
    });

    // --- Update Machine document ---
    machine.status = prediction.status;
    machine.lastReading = { air_temperature, process_temperature, rotational_speed, torque, tool_wear };
    machine.lastUpdated = new Date();
    await machine.save();

    // --- Create Alert if Warning or Critical ---
    let alert = null;
    if (prediction.status === 'Warning' || prediction.status === 'Critical') {
      const message = buildAlertMessage(
        machine.name,
        prediction.predicted_failure_type || prediction.status,
        prediction.failure_probability,
      );
      alert = await Alert.create({
        machineId: machine._id,
        status: prediction.status,
        failure_probability: prediction.failure_probability,
        predicted_failure_type: prediction.predicted_failure_type || null,
        message,
      });
    }

    // --- Emit real-time Socket.io events ---
    socketHandler.emitMachineUpdate({
      machineId: machine.machineId,
      name: machine.name,
      status: machine.status,
      lastReading: machine.lastReading,
      lastUpdated: machine.lastUpdated,
      prediction,
    });
    if (alert) {
      socketHandler.emitNewAlert(alert);
    }

    res.status(201).json({
      success: true,
      prediction,
      reading,
      alert: alert || null,
      machine: { machineId: machine.machineId, name: machine.name, status: machine.status },
    });
  } catch (err) {
    console.error('createReading error:', err);
    res.status(500).json({ error: 'Server error processing reading.', details: err.message });
  }
};

// GET /api/readings/:machineId — last 50 readings for a machine
const getReadings = async (req, res) => {
  try {
    const machine = await Machine.findOne({ machineId: req.params.machineId });
    if (!machine) {
      return res.status(404).json({ error: `Machine "${req.params.machineId}" not found.` });
    }

    const readings = await Reading.find({ machineId: machine._id })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({ success: true, machineId: req.params.machineId, count: readings.length, data: readings });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching readings.', details: err.message });
  }
};

module.exports = { createReading, getReadings };
