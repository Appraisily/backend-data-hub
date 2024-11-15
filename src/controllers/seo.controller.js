const seoService = require('../services/seo.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const data = await seoService.getOverviewData(startDate, endDate);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('SEO overview error:', error);
    handleError(res, error);
  }
};

const getKeywordPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const data = await seoService.getKeywordPerformance(startDate, endDate);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Keyword performance error:', error);
    handleError(res, error);
  }
};

const getPagePerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const data = await seoService.getPagePerformance(startDate, endDate);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Page performance error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getOverview,
  getKeywordPerformance,
  getPagePerformance
};