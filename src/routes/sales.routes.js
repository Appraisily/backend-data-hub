const express = require('express');
const { validateDateRange } = require('../middleware/validators');
const salesController = require('../controllers/sales.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/',
  auth,
  validateDateRange,
  cache(300),
  salesController.getSales
);

router.get('/summary',
  auth,
  validateDateRange,
  cache(300),
  salesController.getSalesSummary
);

module.exports = router;