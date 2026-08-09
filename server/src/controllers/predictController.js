const axios = require('axios');

// POST /api/predict/manual — forward raw values to ML, no DB save
const manualPredict = async (req, res) => {
  try {
    const {
      Air_temperature,
      Process_temperature,
      Rotational_speed,
      Torque,
      Tool_wear,
      Type,
    } = req.body;

    // Input validation
    const required = { Air_temperature, Process_temperature, Rotational_speed, Torque, Tool_wear, Type };
    for (const [field, val] of Object.entries(required)) {
      if (val === undefined || val === null || val === '') {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    const numericFields = { Air_temperature, Process_temperature, Rotational_speed, Torque, Tool_wear };
    for (const [field, val] of Object.entries(numericFields)) {
      if (typeof val !== 'number' || isNaN(val)) {
        return res.status(400).json({ error: `Field "${field}" must be a number.` });
      }
    }
    if (!['L', 'M', 'H'].includes(Type)) {
      return res.status(400).json({ error: 'Type must be one of: L, M, H.' });
    }

    // Forward to ML service
    try {
      const mlUrl = `${process.env.ML_API_URL || 'http://localhost:8000'}/predict`;
      const mlRes = await axios.post(mlUrl, req.body, { timeout: 10000 });
      return res.json({ success: true, prediction: mlRes.data });
    } catch (mlErr) {
      const isTimeout = mlErr.code === 'ECONNABORTED' || mlErr.code === 'ETIMEDOUT';
      const isDown = mlErr.code === 'ECONNREFUSED';
      console.error('ML service error:', mlErr.message);
      return res.status(503).json({
        error: 'ML service unavailable',
        details: isTimeout ? 'Request timed out' : isDown ? 'Connection refused — is the ML service running?' : mlErr.message,
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error during manual predict.', details: err.message });
  }
};

module.exports = { manualPredict };
