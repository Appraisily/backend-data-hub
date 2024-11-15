const express = require('express');
const { validateDateRange } = require('../middleware/validators');
const analyticsController = require('../controllers/analytics.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/overview',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache
  analyticsController.getOverview
);

router.get('/traffic-sources',
  auth,
  validateDateRange,
  cache(300),
  analyticsController.getTrafficSources
);

router.get('/user-behavior',
  auth,
  validateDateRange,
  cache(300),
  analyticsController.getUserBehavior
);

module.exports = router;