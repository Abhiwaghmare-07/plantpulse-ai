const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true,
  },
  air_temperature: {
    type: Number,
    required: true,
  },
  process_temperature: {
    type: Number,
    required: true,
  },
  rotational_speed: {
    type: Number,
    required: true,
  },
  torque: {
    type: Number,
    required: true,
  },
  tool_wear: {
    type: Number,
    required: true,
  },
  failure_probability: {
    type: Number,
    required: true,
  },
  predicted_failure_type: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['Healthy', 'Warning', 'Critical'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('Reading', ReadingSchema);
