const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});