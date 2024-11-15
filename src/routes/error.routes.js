const express = require('express');
const { validateDateRange } = require('../middleware/validators');
const errorController = require('../controllers/error.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

// Get recent errors with minimal caching due to importance
router.get('/recent',
  auth,
  cache(30), // 30 seconds cache
  errorController.getRecentErrors
);

// Get error statistics with longer cache duration
router.get('/count',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache
  errorController.getErrorCount
);

// Get errors by component
router.get('/by-component',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache
  errorController.getErrorsByComponent
);

module.exports = router;