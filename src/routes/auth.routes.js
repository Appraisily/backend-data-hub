const express = require('express');
const { validateRegistration, validateLogin } = require('../middleware/validators');
const authController = require('../controllers/auth.controller');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', 
  rateLimiter,
  validateRegistration,
  authController.register
);

router.post('/login',
  rateLimiter,
  validateLogin,
  authController.login
);

router.post('/refresh-token',
  rateLimiter,
  authController.refreshToken
);

module.exports = router;