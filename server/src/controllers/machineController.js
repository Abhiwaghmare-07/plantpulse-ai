const Machine = require('../models/Machine');

// POST /api/machines — create a new machine
const createMachine = async (req, res) => {
  try {
    const { machineId, name, type } = req.body;

    // Input validation
    if (!machineId || !name || !type) {
      return res.status(400).json({ error: 'machineId, name, and type are required.' });
    }
    if (typeof machineId !== 'string' || typeof name !== 'string') {
      return res.status(400).json({ error: 'machineId and name must be strings.' });
    }
    if (!['L', 'M', 'H'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: L, M, H.' });
    }

    const machine = await Machine.create({ machineId, name, type });
    res.status(201).json({ success: true, data: machine });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `Machine with machineId "${req.body.machineId}" already exists.` });
    }
    res.status(500).json({ error: 'Server error creating machine.', details: err.message });
  }
};

// GET /api/machines — list all machines
const getAllMachines = async (req, res) => {
  try {
    const machines = await Machine.find().sort({ createdAt: -1 });
    res.json({ success: true, count: machines.length, data: machines });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching machines.', details: err.message });
  }
};

// GET /api/machines/:machineId — single machine details
const getMachine = async (req, res) => {
  try {
    const machine = await Machine.findOne({ machineId: req.params.machineId });
    if (!machine) {
      return res.status(404).json({ error: `Machine "${req.params.machineId}" not found.` });
    }
    res.json({ success: true, data: machine });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching machine.', details: err.message });
  }
};

// DELETE /api/machines/:machineId — remove a machine
const deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findOneAndDelete({ machineId: req.params.machineId });
    if (!machine) {
      return res.status(404).json({ error: `Machine "${req.params.machineId}" not found.` });
    }
    res.json({ success: true, message: `Machine "${req.params.machineId}" deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting machine.', details: err.message });
  }
};

module.exports = { createMachine, getAllMachines, getMachine, deleteMachine };
