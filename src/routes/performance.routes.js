const express = require('express');
const performanceController = require('../controllers/performance.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/status',
  auth,
  cache(60), // 1 minute cache
  performanceController.getSiteStatus
);

router.get('/metrics',
  auth,
  cache(300), // 5 minutes cache
  performanceController.getPerformanceMetrics
);

router.get('/daily',
  auth,
  cache(300), // 5 minutes cache
  performanceController.getDailyMetrics
);

module.exports = router;