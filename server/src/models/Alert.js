const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true,
  },
  status: {
    type: String,
    enum: ['Warning', 'Critical'],
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
  message: {
    type: String,
    required: true,
  },
  acknowledged: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Alert', AlertSchema);
