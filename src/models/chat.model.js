const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  customer: {
    email: String,
    name: String
  },
  agent: {
    id: String,
    name: String
  },
  duration: Number,
  messageCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  },
  tags: [String],
  firstResponseTime: Number
}, {
  timestamps: true
});