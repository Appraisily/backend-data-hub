const Error = require('../models/error.model');
const logger = require('../utils/logger');

class ErrorService {
  async getRecentErrors(limit = 10) {
    try {
      return await Error.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('Failed to fetch recent errors:', error);
      throw error;
    }
  }

  async getErrorCount(startDate, endDate, severity) {
    try {
      const query = {
        timestamp: {}
      };

      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
      if (severity) {
        query.severity = severity;
      }

      const errors = await Error.find(query).lean();
      return this.calculateErrorStatistics(errors, startDate, endDate);
    } catch (error) {
      logger.error('Failed to fetch error count:', error);
      throw error;
    }
  }

  async getErrorsByComponent(startDate, endDate) {
    try {
      const errors = await Error.aggregate([
        {
          $match: {
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: '$component',
            count: { $sum: 1 },
            criticalCount: {
              $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
            },
            highCount: {
              $sum: { $cond: [{ $eq: ['$severity', 'High'] }, 1, 0] }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return errors.map(error => ({
        component: error._id || 'Unknown',
        totalErrors: error.count,
        criticalErrors: error.criticalCount,
        highPriorityErrors: error.highCount
      }));
    } catch (error) {
      logger.error('Failed to fetch errors by component:', error);
      throw error;
    }
  }

  calculateErrorStatistics(errors, startDate, endDate) {
    const errorsByDate = {};
    const errorsBySeverity = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };

    errors.forEach(error => {
      // Group by date
      const date = error.timestamp.toISOString().split('T')[0];
      errorsByDate[date] = (errorsByDate[date] || 0) + 1;

      // Count by severity
      errorsBySeverity[error.severity]++;
    });

    const errorsOverTime = this.generateDateRange(startDate, endDate)
      .map(date => ({
        date,
        count: errorsByDate[date] || 0
      }));

    return {
      totalErrors: errors.length,
      errorsBySeverity,
      errorsOverTime,
      resolutionRate: this.calculateResolutionRate(errors)
    };
  }

  generateDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  calculateResolutionRate(errors) {
    if (errors.length === 0) return 0;
    
    const resolvedErrors = errors.filter(error => error.resolved).length;
    return parseFloat(((resolvedErrors / errors.length) * 100).toFixed(2));
  }
}

module.exports = new ErrorService();