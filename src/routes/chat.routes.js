const express = require('express');
const { validateDateRange } = require('../middleware/validators');
const chatController = require('../controllers/chat.controller');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

router.get('/',
  auth,
  validateDateRange,
  cache(60), // 1 minute cache for chat list
  chatController.getChats
);

router.get('/summary',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache for summary
  chatController.getChatSummary
);

router.get('/agent-performance',
  auth,
  validateDateRange,
  cache(300), // 5 minutes cache for agent performance
  chatController.getAgentPerformance
);

module.exports = router;