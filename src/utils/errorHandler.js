const logger = require('./logger');

const handleError = (res, error) => {
  logger.error(error.message);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
};

module.exports = {
  handleError
};