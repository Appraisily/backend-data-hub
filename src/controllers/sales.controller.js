const salesService = require('../services/sales.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getSales = async (req, res) => {
  try {
    const { startDate, endDate, customerEmail, customerName, minAmount, maxAmount } = req.query;
    
    const filters = {
      ...(customerEmail && { customerEmail }),
      ...(customerName && { customerName }),
      ...(minAmount && { minAmount }),
      ...(maxAmount && { maxAmount })
    };
    
    const data = await salesService.getSalesData(startDate, endDate, filters);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate },
      filters
    });
  } catch (error) {
    logger.error('Sales data retrieval error:', error);
    handleError(res, error);
  }
};

const getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const data = await salesService.getSalesSummary(startDate, endDate);
    
    res.json({
      success: true,
      data,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Sales summary retrieval error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getSales,
  getSalesSummary
};