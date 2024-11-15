const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  itemsPerPage: {
    type: Number,
    min: 5,
    max: 100,
    default: 20
  },
  dateFormat: {
    type: String,
    default: 'YYYY-MM-DD'
  },
  language: {
    type: String,
    enum: ['en', 'fr', 'es'],
    default: 'en'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Config', configSchema);