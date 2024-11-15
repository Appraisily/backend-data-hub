const errorService = require('../services/error.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getRecentErrors = async (req, res) => {
  try {
    const { limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 10, 100);
    
    const errors = await errorService.getRecentErrors(parsedLimit);
    
    res.json({
      success: true,
      data: {
        limit: parsedLimit,
        errors
      }
    });
  } catch (error) {
    logger.error('Recent errors retrieval error:', error);
    handleError(res, error);
  }
};

const getErrorCount = async (req, res) => {
  try {
    const { startDate, endDate, severity } = req.query;
    
    const statistics = await errorService.getErrorCount(startDate, endDate, severity);
    
    res.json({
      success: true,
      data: statistics,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Error count retrieval error:', error);
    handleError(res, error);
  }
};

const getErrorsByComponent = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const componentErrors = await errorService.getErrorsByComponent(startDate, endDate);
    
    res.json({
      success: true,
      data: componentErrors,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Component errors retrieval error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getRecentErrors,
  getErrorCount,
  getErrorsByComponent
};