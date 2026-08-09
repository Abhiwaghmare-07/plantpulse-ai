const mongoose = require('mongoose');

const MachineSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: [true, 'Machine ID is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Machine name is required'],
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Machine type is required'],
    enum: ['L', 'M', 'H'],
  },
  status: {
    type: String,
    enum: ['Healthy', 'Warning', 'Critical'],
    default: 'Healthy',
  },
  lastReading: {
    air_temperature: { type: Number },
    process_temperature: { type: Number },
    rotational_speed: { type: Number },
    torque: { type: Number },
    tool_wear: { type: Number },
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Machine', MachineSchema);
