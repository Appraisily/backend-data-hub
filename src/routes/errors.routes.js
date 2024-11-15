const express = require('express');
const { validateDateRange } = require('../middleware/validators');
const errorsController = require('../controllers/errors.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/recent',
  auth,
  cache(60), // 1 minute cache for recent errors
  errorsController.getRecentErrors
);

router.get('/count',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache for error counts
  errorsController.getErrorCount
);

module.exports = router;