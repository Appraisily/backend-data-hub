const performanceService = require('../services/performance.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getSiteStatus = async (req, res) => {
  try {
    const status = await performanceService.getSiteStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Site status retrieval error:', error);
    handleError(res, error);
  }
};

const getPerformanceMetrics = async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Both startTime and endTime are required'
      });
    }

    const metrics = await performanceService.getPerformanceMetrics(startTime, endTime);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Performance metrics retrieval error:', error);
    handleError(res, error);
  }
};

const getDailyMetrics = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const metrics = await performanceService.getDailyMetrics(date);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Daily metrics retrieval error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getSiteStatus,
  getPerformanceMetrics,
  getDailyMetrics
};