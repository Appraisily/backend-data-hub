const Error = require('../models/error.model');
const logger = require('../utils/logger');

const errorLogger = async (err, req, res, next) => {
  try {
    const errorLog = new Error({
      timestamp: new Date(),
      errorType: err.name || 'UnknownError',
      message: err.message,
      stackTrace: err.stack,
      severity: determineSeverity(err),
      component: determineComponent(req),
      metadata: {
        userId: req.user?.id,
        requestId: req.id,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('user-agent'),
        ip: req.ip
      }
    });

    await errorLog.save();
    logger.error('Error logged:', errorLog);
  } catch (loggingError) {
    logger.error('Failed to log error:', loggingError);
  }

  next(err);
};

const determineSeverity = (error) => {
  if (error.status >= 500) return 'Critical';
  if (error.status >= 400) return 'High';
  if (error.name === 'ValidationError') return 'Medium';
  return 'Low';
};

const determineComponent = (req) => {
  const path = req.originalUrl;
  if (path.includes('/api/analytics')) return 'Analytics';
  if (path.includes('/api/ads')) return 'Advertising';
  if (path.includes('/api/sales')) return 'Sales';
  if (path.includes('/api/chat')) return 'Chat';
  return 'General';
};

module.exports = errorLogger;