const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

class AnalyticsService {
  constructor() {
    this.propertyId = 'G-V8T1NRDNC6';
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.initializeClient();
  }

  async initializeClient() {
    try {
      this.analyticsDataClient = new BetaAnalyticsDataClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GOOGLE_CLOUD_PROJECT
      });
      logger.info('GA4 client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GA4 client:', error);
      throw error;
    }
  }

  async getOverviewData(startDate, endDate) {
    const cacheKey = `ga4_overview_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId.replace('G-', '')}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'date' }
        ],
        metrics: [
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' }
        ]
      });

      const formattedData = this.formatOverviewData(response);
      this.cache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      logger.error('Failed to fetch GA4 overview data:', error);
      throw error;
    }
  }

  async getTrafficSources(startDate, endDate) {
    const cacheKey = `ga4_traffic_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId.replace('G-', '')}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'sessionSource' },
          { name: 'sessionMedium' }
        ],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' }
        ],
        orderBys: [
          { metric: { metricName: 'sessions' }, desc: true }
        ]
      });

      const formattedData = this.formatTrafficData(response);
      this.cache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      logger.error('Failed to fetch GA4 traffic sources:', error);
      throw error;
    }
  }

  async getUserBehavior(startDate, endDate) {
    const cacheKey = `ga4_behavior_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId.replace('G-', '')}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'pageTitle' },
          { name: 'pageLocation' },
          { name: 'deviceCategory' }
        ],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'engagementRate' }
        ],
        orderBys: [
          { metric: { metricName: 'screenPageViews' }, desc: true }
        ]
      });

      const formattedData = this.formatUserBehaviorData(response);
      this.cache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      logger.error('Failed to fetch GA4 user behavior:', error);
      throw error;
    }
  }

  formatOverviewData(response) {
    if (!response || !response.rows || !response.rows.length) {
      return {
        totalUsers: 0,
        newUsers: 0,
        activeUsers: 0,
        pageViews: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
        dailyData: []
      };
    }

    const totals = {
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      pageViews: 0,
      avgSessionDuration: 0,
      bounceRate: 0
    };

    const dailyData = response.rows.map(row => {
      const metrics = row.metricValues;
      const date = row.dimensionValues[0].value;
      
      const dailyMetrics = {
        date,
        totalUsers: parseInt(metrics[0].value),
        newUsers: parseInt(metrics[1].value),
        activeUsers: parseInt(metrics[2].value),
        pageViews: parseInt(metrics[3].value),
        avgSessionDuration: parseFloat((parseInt(metrics[4].value) / 60).toFixed(2)),
        bounceRate: parseFloat(metrics[5].value)
      };

      totals.totalUsers += dailyMetrics.totalUsers;
      totals.newUsers += dailyMetrics.newUsers;
      totals.activeUsers += dailyMetrics.activeUsers;
      totals.pageViews += dailyMetrics.pageViews;
      totals.avgSessionDuration += dailyMetrics.avgSessionDuration;
      totals.bounceRate += dailyMetrics.bounceRate;

      return dailyMetrics;
    });

    const daysCount = dailyData.length;

    return {
      totalUsers: totals.totalUsers,
      newUsers: totals.newUsers,
      activeUsers: totals.activeUsers,
      pageViews: totals.pageViews,
      avgSessionDuration: parseFloat((totals.avgSessionDuration / daysCount).toFixed(2)),
      bounceRate: parseFloat((totals.bounceRate / daysCount).toFixed(2)),
      dailyData: dailyData.sort((a, b) => new Date(a.date) - new Date(b.date))
    };
  }

  formatTrafficData(response) {
    if (!response || !response.rows) {
      return [];
    }

    return response.rows.map(row => ({
      source: row.dimensionValues[0].value || '(direct)',
      medium: row.dimensionValues[1].value || '(none)',
      metrics: {
        users: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
        bounceRate: parseFloat(row.metricValues[3].value)
      }
    }));
  }

  formatUserBehaviorData(response) {
    if (!response || !response.rows) {
      return [];
    }

    return response.rows.map(row => ({
      pageTitle: row.dimensionValues[0].value,
      pageUrl: row.dimensionValues[1].value,
      deviceCategory: row.dimensionValues[2].value,
      metrics: {
        pageViews: parseInt(row.metricValues[0].value),
        avgSessionDuration: parseFloat((parseInt(row.metricValues[1].value) / 60).toFixed(2)),
        bounceRate: parseFloat(row.metricValues[2].value),
        engagementRate: parseFloat(row.metricValues[3].value)
      }
    }));
  }
}

module.exports = new AnalyticsService();