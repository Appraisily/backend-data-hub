const express = require('express');
const { validateDateRange } = require('../middleware/validators');
const adsController = require('../controllers/ads.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/performance',
  auth,
  validateDateRange,
  cache(300),
  adsController.getPerformance
);

router.get('/costs',
  auth,
  validateDateRange,
  cache(300),
  adsController.getCosts
);

module.exports = router;