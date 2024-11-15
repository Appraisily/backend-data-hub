const sheetsService = require('./sheets.service');
const logger = require('../utils/logger');

class ErrorLogsService {
  constructor() {
    this.spreadsheetId = process.env.ERROR_LOGS_SHEET_ID;
    this.range = 'Errors!A:E'; // timestamp, errorType, message, stackTrace, severity
  }

  async getRecentErrors(limit = 10) {
    try {
      const data = await sheetsService.getSheetData(this.spreadsheetId, this.range);
      return this.formatRecentErrors(data, limit);
    } catch (error) {
      logger.error('Failed to fetch recent errors:', error);
      throw error;
    }
  }

  async getErrorCount(startDate, endDate, severity) {
    try {
      const data = await sheetsService.getSheetData(this.spreadsheetId, this.range);
      return this.calculateErrorStatistics(data, startDate, endDate, severity);
    } catch (error) {
      logger.error('Failed to fetch error count:', error);
      throw error;
    }
  }

  formatRecentErrors(data, limit) {
    if (!data || data.length < 2) return [];

    const [headers, ...rows] = data;
    return rows
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .slice(0, limit)
      .map(row => ({
        timestamp: row[0],
        errorType: row[1],
        message: row[2],
        stackTrace: row[3],
        severity: row[4]
      }));
  }

  calculateErrorStatistics(data, startDate, endDate, severity) {
    if (!data || data.length < 2) {
      return this.getEmptyStatistics(startDate, endDate, severity);
    }

    const [headers, ...rows] = data;
    const filteredRows = rows.filter(row => 
      this.matchesDateRange(row[0], startDate, endDate) &&
      (!severity || row[4] === severity)
    );

    const errorsByDate = this.groupErrorsByDate(filteredRows);

    return {
      startDate,
      endDate,
      severity,
      totalErrors: filteredRows.length,
      errorsOverTime: this.formatErrorsOverTime(errorsByDate, startDate, endDate)
    };
  }

  matchesDateRange(dateStr, startDate, endDate) {
    if (!startDate && !endDate) return true;
    
    const date = new Date(dateStr);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return (!start || date >= start) && (!end || date <= end);
  }

  groupErrorsByDate(rows) {
    const errorsByDate = {};
    rows.forEach(row => {
      const date = new Date(row[0]).toISOString().split('T')[0];
      errorsByDate[date] = (errorsByDate[date] || 0) + 1;
    });
    return errorsByDate;
  }

  formatErrorsOverTime(errorsByDate, startDate, endDate) {
    const result = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        errorCount: errorsByDate[dateStr] || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  getEmptyStatistics(startDate, endDate, severity) {
    return {
      startDate,
      endDate,
      severity,
      totalErrors: 0,
      errorsOverTime: []
    };
  }
}

module.exports = new ErrorLogsService();