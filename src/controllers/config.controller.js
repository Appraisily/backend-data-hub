const configService = require('../services/config.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getDisplaySettings = async (req, res) => {
  try {
    const settings = await configService.getDisplaySettings();
    
    res.json({
      success: true,
      settings,
      lastUpdated: settings.updatedAt
    });
  } catch (error) {
    logger.error('Display settings retrieval error:', error);
    handleError(res, error);
  }
};

const updateDisplaySettings = async (req, res) => {
  try {
    const settings = await configService.updateDisplaySettings(req.body, req.user.userId);
    
    res.json({
      success: true,
      message: 'Configuration settings updated successfully',
      settings,
      lastUpdated: settings.updatedAt
    });
  } catch (error) {
    logger.error('Display settings update error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getDisplaySettings,
  updateDisplaySettings
};