const express = require('express');
const router = express.Router();
const { getSimulatorStatus, stopSimulator, startSimulator } = require('../simulator/simulator');

// GET /api/simulator/status — returns running state + current machine states
router.get('/status', (req, res) => {
  res.json({ success: true, data: getSimulatorStatus() });
});

module.exports = router;
