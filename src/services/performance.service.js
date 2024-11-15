const axios = require('axios');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

class PerformanceService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 60 }); // 1 minute cache
    this.netlifyToken = process.env.NETLIFY_ACCESS_TOKEN;
    this.siteId = process.env.NETLIFY_SITE_ID;
    this.baseUrl = 'https://api.netlify.com/api/v1';
  }

  async getSiteStatus() {
    const cacheKey = 'site_status';
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const [siteInfo, deploys] = await Promise.all([
        this.fetchSiteInfo(),
        this.fetchRecentDeploys()
      ]);

      const status = {
        site: siteInfo,
        lastDeploy: deploys[0],
        isLive: siteInfo.published_deploy && siteInfo.published_deploy.id === deploys[0].id,
        timestamp: new Date().toISOString()
      };

      this.cache.set(cacheKey, status);
      return status;
    } catch (error) {
      logger.error('Failed to fetch site status:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(startTime, endTime) {
    const cacheKey = `metrics_${startTime}_${endTime}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const [functions, bandwidth, builds] = await Promise.all([
        this.fetchFunctionMetrics(startTime, endTime),
        this.fetchBandwidthUsage(startTime, endTime),
        this.fetchBuildMetrics(startTime, endTime)
      ]);

      const metrics = {
        functions,
        bandwidth,
        builds,
        period: { startTime, endTime }
      };

      this.cache.set(cacheKey, metrics);
      return metrics;
    } catch (error) {
      logger.error('Failed to fetch performance metrics:', error);
      throw error;
    }
  }

  async getDailyMetrics(date) {
    const cacheKey = `daily_metrics_${date}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/sites/${this.siteId}/analytics?from=${date}`,
        this.getRequestConfig()
      );

      const metrics = this.formatDailyMetrics(response.data);
      this.cache.set(cacheKey, metrics);
      return metrics;
    } catch (error) {
      logger.error('Failed to fetch daily metrics:', error);
      throw error;
    }
  }

  async fetchSiteInfo() {
    const response = await axios.get(
      `${this.baseUrl}/sites/${this.siteId}`,
      this.getRequestConfig()
    );
    return response.data;
  }

  async fetchRecentDeploys() {
    const response = await axios.get(
      `${this.baseUrl}/sites/${this.siteId}/deploys?per_page=5`,
      this.getRequestConfig()
    );
    return response.data;
  }

  async fetchFunctionMetrics(startTime, endTime) {
    const response = await axios.get(
      `${this.baseUrl}/sites/${this.siteId}/functions/metrics`,
      {
        ...this.getRequestConfig(),
        params: { from: startTime, to: endTime }
      }
    );

    return this.formatFunctionMetrics(response.data);
  }

  async fetchBandwidthUsage(startTime, endTime) {
    const response = await axios.get(
      `${this.baseUrl}/sites/${this.siteId}/bandwidth`,
      {
        ...this.getRequestConfig(),
        params: { from: startTime, to: endTime }
      }
    );

    return this.formatBandwidthMetrics(response.data);
  }

  async fetchBuildMetrics(startTime, endTime) {
    const response = await axios.get(
      `${this.baseUrl}/sites/${this.siteId}/builds`,
      {
        ...this.getRequestConfig(),
        params: { from: startTime, to: endTime }
      }
    );

    return this.formatBuildMetrics(response.data);
  }

  getRequestConfig() {
    return {
      headers: {
        Authorization: `Bearer ${this.netlifyToken}`
      }
    };
  }

  formatFunctionMetrics(data) {
    return {
      totalInvocations: data.invocations || 0,
      averageExecutionTime: data.average_execution_time || 0,
      timeouts: data.timeouts || 0,
      errors: data.errors || 0,
      successRate: data.invocations ? 
        ((data.invocations - data.errors) / data.invocations * 100).toFixed(2) : 100
    };
  }

  formatBandwidthMetrics(data) {
    return {
      totalBandwidth: this.formatBytes(data.total || 0),
      cdnBandwidth: this.formatBytes(data.cdn || 0),
      originBandwidth: this.formatBytes(data.origin || 0)
    };
  }

  formatBuildMetrics(data) {
    return {
      totalBuilds: data.length,
      successfulBuilds: data.filter(build => build.done).length,
      failedBuilds: data.filter(build => build.error).length,
      averageBuildTime: data.reduce((acc, build) => acc + (build.duration || 0), 0) / data.length
    };
  }

  formatDailyMetrics(data) {
    return {
      pageViews: data.pageviews || 0,
      visitors: data.visitors || 0,
      bandwidth: this.formatBytes(data.bandwidth || 0),
      requests: data.requests || 0,
      responseTime: {
        p50: data.response_time?.p50 || 0,
        p90: data.response_time?.p90 || 0,
        p99: data.response_time?.p99 || 0
      }
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

module.exports = new PerformanceService();