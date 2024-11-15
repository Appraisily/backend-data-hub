const analyticsService = require('../services/analytics.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }

    const data = await analyticsService.getOverviewData(startDate, endDate);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Analytics overview error:', error);
    handleError(res, error);
  }
};

const getTrafficSources = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }

    const data = await analyticsService.getTrafficSources(startDate, endDate);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Traffic sources error:', error);
    handleError(res, error);
  }
};

const getUserBehavior = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }

    const data = await analyticsService.getUserBehavior(startDate, endDate);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('User behavior error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getOverview,
  getTrafficSources,
  getUserBehavior
};