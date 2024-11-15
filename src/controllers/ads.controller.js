const adsService = require('../services/ads.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getPerformance = async (req, res) => {
  try {
    const { startDate, endDate, campaignId } = req.query;
    
    const data = await adsService.getPerformanceData(startDate, endDate, campaignId);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Ads performance error:', error);
    handleError(res, error);
  }
};

const getCosts = async (req, res) => {
  try {
    const { startDate, endDate, campaignId } = req.query;
    
    const data = await adsService.getCostsData(startDate, endDate, campaignId);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Ads costs error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getPerformance,
  getCosts
};