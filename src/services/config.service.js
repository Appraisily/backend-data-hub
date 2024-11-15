const Config = require('../models/config.model');
const logger = require('../utils/logger');

class ConfigService {
  async getDisplaySettings() {
    try {
      const config = await Config.findOne().lean();
      return config || await this.createDefaultConfig();
    } catch (error) {
      logger.error('Failed to fetch display settings:', error);
      throw error;
    }
  }

  async updateDisplaySettings(settings, userId) {
    try {
      const config = await Config.findOne();
      
      if (!config) {
        return await Config.create({
          ...settings,
          updatedBy: userId
        });
      }

      Object.assign(config, settings, { updatedBy: userId });
      await config.save();
      
      return config;
    } catch (error) {
      logger.error('Failed to update display settings:', error);
      throw error;
    }
  }

  async createDefaultConfig() {
    try {
      return await Config.create({
        theme: 'light',
        itemsPerPage: 20,
        dateFormat: 'YYYY-MM-DD',
        language: 'en'
      });
    } catch (error) {
      logger.error('Failed to create default config:', error);
      throw error;
    }
  }
}

module.exports = new ConfigService();