const { GoogleAdsApi } = require('google-ads-api');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

class AdsService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.initializeClient();
  }

  initializeClient() {
    try {
      this.client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
      });

      this.customer = this.client.Customer({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
        login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN
      });

      logger.info('Google Ads API client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Ads API client:', error);
      throw error;
    }
  }

  async getPerformanceData(startDate, endDate, campaignId) {
    const cacheKey = `performance_${startDate}_${endDate}_${campaignId || 'all'}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.average_cpc,
          metrics.ctr,
          metrics.conversion_rate,
          segments.date
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ${campaignId ? `AND campaign.id = ${campaignId}` : ''}
        ORDER BY segments.date ASC
      `;

      const response = await this.customer.query(query);
      const formattedData = this.formatPerformanceData(response);
      
      this.cache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      logger.error('Failed to fetch ads performance data:', error);
      throw error;
    }
  }

  async getCostsData(startDate, endDate, campaignId) {
    const cacheKey = `costs_${startDate}_${endDate}_${campaignId || 'all'}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const query = `
        SELECT
          segments.date,
          campaign.id,
          campaign.name,
          metrics.cost_micros,
          metrics.average_cpc,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ${campaignId ? `AND campaign.id = ${campaignId}` : ''}
        ORDER BY segments.date ASC
      `;

      const response = await this.customer.query(query);
      const formattedData = this.formatCostsData(response);
      
      this.cache.set(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      logger.error('Failed to fetch ads costs data:', error);
      throw error;
    }
  }

  formatPerformanceData(data) {
    if (!data || !data.length) {
      return {
        campaigns: [],
        summary: this.getEmptyPerformanceSummary()
      };
    }

    const campaignData = {};
    const summary = {
      totalClicks: 0,
      totalImpressions: 0,
      totalCost: 0,
      totalConversions: 0,
      averageCtr: 0,
      averageCpc: 0,
      averageConversionRate: 0
    };

    data.forEach(row => {
      const campaignId = row.campaign.id;
      if (!campaignData[campaignId]) {
        campaignData[campaignId] = {
          campaignId,
          campaignName: row.campaign.name,
          status: row.campaign.status,
          dailyData: [],
          totals: {
            clicks: 0,
            impressions: 0,
            cost: 0,
            conversions: 0
          }
        };
      }

      const dailyMetrics = {
        date: row.segments.date,
        clicks: parseInt(row.metrics.clicks),
        impressions: parseInt(row.metrics.impressions),
        cost: parseFloat((row.metrics.cost_micros / 1000000).toFixed(2)),
        conversions: parseFloat(row.metrics.conversions),
        ctr: parseFloat((row.metrics.ctr * 100).toFixed(2)),
        averageCpc: parseFloat((row.metrics.average_cpc / 1000000).toFixed(2)),
        conversionRate: parseFloat((row.metrics.conversion_rate * 100).toFixed(2))
      };

      campaignData[campaignId].dailyData.push(dailyMetrics);
      campaignData[campaignId].totals.clicks += dailyMetrics.clicks;
      campaignData[campaignId].totals.impressions += dailyMetrics.impressions;
      campaignData[campaignId].totals.cost += dailyMetrics.cost;
      campaignData[campaignId].totals.conversions += dailyMetrics.conversions;

      summary.totalClicks += dailyMetrics.clicks;
      summary.totalImpressions += dailyMetrics.impressions;
      summary.totalCost += dailyMetrics.cost;
      summary.totalConversions += dailyMetrics.conversions;
    });

    const campaigns = Object.values(campaignData).map(campaign => ({
      ...campaign,
      metrics: {
        ...campaign.totals,
        ctr: campaign.totals.impressions ? 
          parseFloat(((campaign.totals.clicks / campaign.totals.impressions) * 100).toFixed(2)) : 0,
        averageCpc: campaign.totals.clicks ? 
          parseFloat((campaign.totals.cost / campaign.totals.clicks).toFixed(2)) : 0,
        conversionRate: campaign.totals.clicks ? 
          parseFloat(((campaign.totals.conversions / campaign.totals.clicks) * 100).toFixed(2)) : 0
      }
    }));

    summary.averageCtr = summary.totalImpressions ? 
      parseFloat(((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2)) : 0;
    summary.averageCpc = summary.totalClicks ? 
      parseFloat((summary.totalCost / summary.totalClicks).toFixed(2)) : 0;
    summary.averageConversionRate = summary.totalClicks ? 
      parseFloat(((summary.totalConversions / summary.totalClicks) * 100).toFixed(2)) : 0;

    return {
      campaigns,
      summary
    };
  }

  formatCostsData(data) {
    if (!data || !data.length) {
      return {
        costsOverTime: [],
        campaigns: [],
        summary: this.getEmptyCostsSummary()
      };
    }

    const costsByDate = {};
    const campaignCosts = {};
    const summary = {
      totalCost: 0,
      totalConversions: 0,
      averageCpc: 0,
      averageCostPerConversion: 0
    };

    data.forEach(row => {
      const date = row.segments.date;
      const campaignId = row.campaign.id;
      const cost = parseFloat((row.metrics.cost_micros / 1000000).toFixed(2));
      const conversions = parseFloat(row.metrics.conversions);

      // Aggregate by date
      if (!costsByDate[date]) {
        costsByDate[date] = { date, cost: 0, conversions: 0 };
      }
      costsByDate[date].cost += cost;
      costsByDate[date].conversions += conversions;

      // Aggregate by campaign
      if (!campaignCosts[campaignId]) {
        campaignCosts[campaignId] = {
          campaignId,
          campaignName: row.campaign.name,
          totalCost: 0,
          totalConversions: 0
        };
      }
      campaignCosts[campaignId].totalCost += cost;
      campaignCosts[campaignId].totalConversions += conversions;

      // Update summary
      summary.totalCost += cost;
      summary.totalConversions += conversions;
    });

    const costsOverTime = Object.values(costsByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(daily => ({
        ...daily,
        costPerConversion: daily.conversions ? 
          parseFloat((daily.cost / daily.conversions).toFixed(2)) : 0
      }));

    const campaigns = Object.values(campaignCosts)
      .map(campaign => ({
        ...campaign,
        averageCostPerConversion: campaign.totalConversions ? 
          parseFloat((campaign.totalCost / campaign.totalConversions).toFixed(2)) : 0
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    summary.averageCostPerConversion = summary.totalConversions ? 
      parseFloat((summary.totalCost / summary.totalConversions).toFixed(2)) : 0;
    summary.averageDailyCost = parseFloat((summary.totalCost / costsOverTime.length).toFixed(2));

    return {
      costsOverTime,
      campaigns,
      summary
    };
  }

  getEmptyPerformanceSummary() {
    return {
      totalClicks: 0,
      totalImpressions: 0,
      totalCost: 0,
      totalConversions: 0,
      averageCtr: 0,
      averageCpc: 0,
      averageConversionRate: 0
    };
  }

  getEmptyCostsSummary() {
    return {
      totalCost: 0,
      totalConversions: 0,
      averageCostPerConversion: 0,
      averageDailyCost: 0
    };
  }
}

module.exports = new AdsService();