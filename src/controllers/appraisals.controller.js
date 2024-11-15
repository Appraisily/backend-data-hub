const appraisalsService = require('../services/appraisals.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getAppraisals = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const data = await appraisalsService.getAppraisalsData(startDate, endDate, status);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate },
      status: status || 'all'
    });
  } catch (error) {
    logger.error('Appraisals data retrieval error:', error);
    handleError(res, error);
  }
};

const getAppraisalsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const data = await appraisalsService.getAppraisalsSummary(startDate, endDate);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Appraisals summary retrieval error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getAppraisals,
  getAppraisalsSummary
};