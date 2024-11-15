const express = require('express');
const { validateDateRange } = require('../middleware/validators');
const seoController = require('../controllers/seo.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/overview',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache
  seoController.getOverview
);

router.get('/keywords',
  auth,
  validateDateRange,
  cache(300),
  seoController.getKeywordPerformance
);

router.get('/pages',
  auth,
  validateDateRange,
  cache(300),
  seoController.getPagePerformance
);

module.exports = router;