const sheetsService = require('./sheets.service');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

class AppraisalsService {
  constructor() {
    this.spreadsheetId = '1PDdt-tEV78uMGW-813UTcVxC9uzrRXQSmNLCI1rR-xc';
    this.pendingRange = 'Pending Appraisals!A:O';
    this.completedRange = 'Completed Appraisals!A:O';
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
  }

  async getAppraisalsData(startDate, endDate, status) {
    const cacheKey = `appraisals_${startDate}_${endDate}_${status || 'all'}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const [pendingData, completedData] = await Promise.all([
        sheetsService.getSheetData(this.spreadsheetId, this.pendingRange),
        sheetsService.getSheetData(this.spreadsheetId, this.completedRange)
      ]);

      const formattedData = this.filterAndFormatAppraisalsData(
        pendingData,
        completedData,
        startDate,
        endDate,
        status
      );

      this.cache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      logger.error('Failed to fetch appraisals data:', error);
      throw error;
    }
  }

  async getAppraisalsSummary(startDate, endDate) {
    const cacheKey = `appraisals_summary_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const [pendingData, completedData] = await Promise.all([
        sheetsService.getSheetData(this.spreadsheetId, this.pendingRange),
        sheetsService.getSheetData(this.spreadsheetId, this.completedRange)
      ]);

      const summary = this.calculateAppraisalsSummary(
        pendingData,
        completedData,
        startDate,
        endDate
      );

      this.cache.set(cacheKey, summary);
      return summary;
    } catch (error) {
      logger.error('Failed to fetch appraisals summary:', error);
      throw error;
    }
  }

  filterAndFormatAppraisalsData(pendingData, completedData, startDate, endDate, status) {
    if ((!pendingData || pendingData.length < 2) && (!completedData || completedData.length < 2)) {
      return [];
    }

    let appraisals = [];

    if (!status || status === 'pending') {
      const [pendingHeaders, ...pendingRows] = pendingData || [[], []];
      const pendingAppraisals = pendingRows
        .filter(row => this.matchesDateRange(row[0], startDate, endDate))
        .map(row => this.formatAppraisalRecord(row, 'pending'));
      appraisals = appraisals.concat(pendingAppraisals);
    }

    if (!status || status === 'completed') {
      const [completedHeaders, ...completedRows] = completedData || [[], []];
      const completedAppraisals = completedRows
        .filter(row => this.matchesDateRange(row[0], startDate, endDate))
        .map(row => this.formatAppraisalRecord(row, 'completed'));
      appraisals = appraisals.concat(completedAppraisals);
    }

    return appraisals.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  calculateAppraisalsSummary(pendingData, completedData, startDate, endDate) {
    const [, ...pendingRows] = pendingData || [[], []];
    const [, ...completedRows] = completedData || [[], []];

    const filteredPending = pendingRows.filter(row => 
      this.matchesDateRange(row[0], startDate, endDate)
    );

    const filteredCompleted = completedRows.filter(row => 
      this.matchesDateRange(row[0], startDate, endDate)
    );

    const summary = {
      totalAppraisals: filteredPending.length + filteredCompleted.length,
      pendingAppraisals: filteredPending.length,
      completedAppraisals: filteredCompleted.length,
      completionRate: 0,
      averageAppraisalValue: 0,
      serviceTypeBreakdown: this.calculateServiceTypeBreakdown([...filteredPending, ...filteredCompleted]),
      dailyStats: this.calculateDailyStats(filteredPending, filteredCompleted, startDate, endDate)
    };

    // Calculate completion rate
    if (summary.totalAppraisals > 0) {
      summary.completionRate = parseFloat(
        ((summary.completedAppraisals / summary.totalAppraisals) * 100).toFixed(2)
      );
    }

    // Calculate average appraisal value from completed appraisals
    const totalValue = filteredCompleted.reduce((sum, row) => {
      const value = this.parseAppraisalValue(row[9]); // Appraisal Value column
      return sum + value;
    }, 0);

    if (filteredCompleted.length > 0) {
      summary.averageAppraisalValue = parseFloat(
        (totalValue / filteredCompleted.length).toFixed(2)
      );
    }

    return summary;
  }

  matchesDateRange(dateStr, startDate, endDate) {
    if (!startDate && !endDate) return true;
    
    const date = new Date(dateStr);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return (!start || date >= start) && (!end || date <= end);
  }

  formatAppraisalRecord(row, status) {
    return {
      date: row[0],
      serviceType: row[1],
      sessionId: row[2],
      customerEmail: row[3],
      customerName: row[4],
      status: status,
      imageDescription: row[7],
      customerDescription: row[8],
      appraisalValue: this.parseAppraisalValue(row[9]),
      appraisersDescription: row[10],
      finalDescription: row[11],
      pdfLink: row[12],
      docLink: row[13]
    };
  }

  calculateServiceTypeBreakdown(appraisals) {
    const breakdown = {};
    
    appraisals.forEach(row => {
      const serviceType = row[1];
      if (!breakdown[serviceType]) {
        breakdown[serviceType] = {
          total: 0,
          pending: 0,
          completed: 0
        };
      }
      
      breakdown[serviceType].total++;
      if (row[5] === 'Completed') {
        breakdown[serviceType].completed++;
      } else {
        breakdown[serviceType].pending++;
      }
    });

    return Object.entries(breakdown).map(([type, stats]) => ({
      serviceType: type,
      total: stats.total,
      pending: stats.pending,
      completed: stats.completed,
      completionRate: parseFloat(((stats.completed / stats.total) * 100).toFixed(2))
    }));
  }

  calculateDailyStats(pendingAppraisals, completedAppraisals, startDate, endDate) {
    const dailyStats = {};
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Initialize daily stats for each day in the range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = {
        date: dateStr,
        totalAppraisals: 0,
        pendingAppraisals: 0,
        completedAppraisals: 0,
        totalValue: 0
      };
    }

    // Add pending appraisals stats
    pendingAppraisals.forEach(row => {
      const date = new Date(row[0]).toISOString().split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].totalAppraisals++;
        dailyStats[date].pendingAppraisals++;
      }
    });

    // Add completed appraisals stats
    completedAppraisals.forEach(row => {
      const date = new Date(row[0]).toISOString().split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].totalAppraisals++;
        dailyStats[date].completedAppraisals++;
        dailyStats[date].totalValue += this.parseAppraisalValue(row[9]);
      }
    });

    // Convert to array and calculate additional metrics
    return Object.values(dailyStats)
      .map(day => ({
        ...day,
        completionRate: day.totalAppraisals > 0 
          ? parseFloat(((day.completedAppraisals / day.totalAppraisals) * 100).toFixed(2))
          : 0,
        averageValue: day.completedAppraisals > 0
          ? parseFloat((day.totalValue / day.completedAppraisals).toFixed(2))
          : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  parseAppraisalValue(valueStr) {
    if (!valueStr) return 0;
    // Remove currency symbols and convert to number
    const value = parseFloat(valueStr.replace(/[^0-9.-]+/g, ''));
    return isNaN(value) ? 0 : value;
  }
}

module.exports = new AppraisalsService();