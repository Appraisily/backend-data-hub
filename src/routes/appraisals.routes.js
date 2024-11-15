const express = require('express');
const { validateDateRange } = require('../middleware/validators');
const appraisalsController = require('../controllers/appraisals.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache
  appraisalsController.getAppraisals
);

router.get('/summary',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache
  appraisalsController.getAppraisalsSummary
);

module.exports = router;