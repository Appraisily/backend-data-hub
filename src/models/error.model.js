const mongoose = require('mongoose');

const errorSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  errorType: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  stackTrace: String,
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true
  },
  component: String,
  metadata: {
    userId: String,
    requestId: String,
    url: String,
    method: String,
    userAgent: String,
    ip: String
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: String,
  resolution: String
}, {
  timestamps: true
});