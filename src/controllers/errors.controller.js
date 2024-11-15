const errorLogsService = require('../services/errors.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getRecentErrors = async (req, res) => {
  try {
    const { limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 10, 100);
    
    const data = await errorLogsService.getRecentErrors(parsedLimit);
    
    res.json({
      success: true,
      limit: parsedLimit,
      totalErrors: data.length,
      errors: data
    });
  } catch (error) {
    logger.error('Recent errors retrieval error:', error);
    handleError(res, error);
  }
};

const getErrorCount = async (req, res) => {
  try {
    const { startDate, endDate, severity } = req.query;
    
    const data = await errorLogsService.getErrorCount(startDate, endDate, severity);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error count retrieval error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getRecentErrors,
  getErrorCount
};