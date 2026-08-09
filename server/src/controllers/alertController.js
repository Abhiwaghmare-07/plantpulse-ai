const Alert = require('../models/Alert');

// GET /api/alerts — list alerts, optional ?acknowledged=false filter
const getAlerts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.acknowledged !== undefined) {
      filter.acknowledged = req.query.acknowledged === 'true';
    }

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .populate('machineId', 'machineId name type');

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching alerts.', details: err.message });
  }
};

// PATCH /api/alerts/:id/acknowledge — mark alert as acknowledged
const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    ).populate('machineId', 'machineId name type');

    if (!alert) {
      return res.status(404).json({ error: `Alert with id "${req.params.id}" not found.` });
    }

    res.json({ success: true, message: 'Alert acknowledged.', data: alert });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid alert ID format.' });
    }
    res.status(500).json({ error: 'Server error acknowledging alert.', details: err.message });
  }
};

module.exports = { getAlerts, acknowledgeAlert };
