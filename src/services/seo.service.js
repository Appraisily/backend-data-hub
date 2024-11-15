const { google } = require('googleapis');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

class SEOService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.searchconsole = google.searchconsole('v1');
    this.siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
    this.initializeClient();
  }

  async initializeClient() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
      });
      
      this.client = await auth.getClient();
      google.options({ auth: this.client });
      logger.info('Search Console client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Search Console client:', error);
      throw error;
    }
  }

  async getOverviewData(startDate, endDate) {
    const cacheKey = `seo_overview_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const [totalData, deviceData, countryData] = await Promise.all([
        this.fetchTotalMetrics(startDate, endDate),
        this.fetchDeviceMetrics(startDate, endDate),
        this.fetchCountryMetrics(startDate, endDate)
      ]);

      const overview = {
        totals: totalData,
        byDevice: deviceData,
        byCountry: countryData,
        period: { startDate, endDate }
      };

      this.cache.set(cacheKey, overview);
      return overview;
    } catch (error) {
      logger.error('Failed to fetch SEO overview data:', error);
      throw error;
    }
  }

  async getKeywordPerformance(startDate, endDate) {
    const cacheKey = `seo_keywords_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.searchconsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 100,
          aggregationType: 'byProperty'
        }
      });

      const keywords = this.formatKeywordData(response.data);
      this.cache.set(cacheKey, keywords);
      return keywords;
    } catch (error) {
      logger.error('Failed to fetch keyword performance:', error);
      throw error;
    }
  }

  async getPagePerformance(startDate, endDate) {
    const cacheKey = `seo_pages_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.searchconsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 100,
          aggregationType: 'byPage'
        }
      });

      const pages = this.formatPageData(response.data);
      this.cache.set(cacheKey, pages);
      return pages;
    } catch (error) {
      logger.error('Failed to fetch page performance:', error);
      throw error;
    }
  }

  async fetchTotalMetrics(startDate, endDate) {
    const response = await this.searchconsole.searchanalytics.query({
      siteUrl: this.siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date'],
        aggregationType: 'byProperty'
      }
    });

    return this.formatTotalMetrics(response.data);
  }

  async fetchDeviceMetrics(startDate, endDate) {
    const response = await this.searchconsole.searchanalytics.query({
      siteUrl: this.siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['device'],
        aggregationType: 'byProperty'
      }
    });

    return this.formatDeviceMetrics(response.data);
  }

  async fetchCountryMetrics(startDate, endDate) {
    const response = await this.searchconsole.searchanalytics.query({
      siteUrl: this.siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['country'],
        rowLimit: 10,
        aggregationType: 'byProperty'
      }
    });

    return this.formatCountryMetrics(response.data);
  }

  formatTotalMetrics(data) {
    if (!data.rows) {
      return {
        totalClicks: 0,
        totalImpressions: 0,
        averageCTR: 0,
        averagePosition: 0,
        dailyMetrics: []
      };
    }

    const totals = {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    };

    const dailyMetrics = data.rows.map(row => {
      totals.clicks += row.clicks;
      totals.impressions += row.impressions;
      totals.ctr += row.ctr;
      totals.position += row.position;

      return {
        date: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        position: parseFloat(row.position.toFixed(2))
      };
    });

    const daysCount = dailyMetrics.length || 1;

    return {
      totalClicks: totals.clicks,
      totalImpressions: totals.impressions,
      averageCTR: parseFloat(((totals.ctr / daysCount) * 100).toFixed(2)),
      averagePosition: parseFloat((totals.position / daysCount).toFixed(2)),
      dailyMetrics: dailyMetrics.sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  formatDeviceMetrics(data) {
    if (!data.rows) return [];

    return data.rows.map(row => ({
      device: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: parseFloat((row.ctr * 100).toFixed(2)),
      position: parseFloat(row.position.toFixed(2))
    }));
  }

  formatCountryMetrics(data) {
    if (!data.rows) return [];

    return data.rows.map(row => ({
      country: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: parseFloat((row.ctr * 100).toFixed(2)),
      position: parseFloat(row.position.toFixed(2))
    }));
  }

  formatKeywordData(data) {
    if (!data.rows) return [];

    return data.rows
      .map(row => ({
        keyword: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        position: parseFloat(row.position.toFixed(2))
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  formatPageData(data) {
    if (!data.rows) return [];

    return data.rows
      .map(row => ({
        url: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        position: parseFloat(row.position.toFixed(2))
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }
}

module.exports = new SEOService();