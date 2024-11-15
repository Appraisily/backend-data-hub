const express = require('express');
const { validateConfig } = require('../middleware/validators');
const configController = require('../controllers/config.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/display',
  auth,
  cache(300), // 5 minutes cache
  configController.getDisplaySettings
);

router.post('/display',
  auth,
  validateConfig,
  configController.updateDisplaySettings
);

module.exports = router;