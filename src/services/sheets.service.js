const { google } = require('googleapis');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.sheets = google.sheets('v4');
    this.initializeClient();
  }

  async initializeClient() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      
      this.client = await auth.getClient();
      google.options({ auth: this.client });
      logger.info('Google Sheets client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets client:', error);
      throw error;
    }
  }

  async getSheetData(spreadsheetId, range) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });

      if (!response.data.values) {
        logger.warn('No data found in sheet');
        return [];
      }

      return response.data.values;
    } catch (error) {
      logger.error('Failed to fetch sheet data:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();