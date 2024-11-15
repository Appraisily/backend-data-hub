const sheetsService = require('./sheets.service');
const logger = require('../utils/logger');

class SalesService {
  constructor() {
    this.spreadsheetId = '1DwC7etf8T-qTltN2jP4YvHPR3U0mvlm24BUv4zxXnZM';
    this.range = 'Sales!A:G';
  }

  async getSalesData(startDate, endDate, filters = {}) {
    try {
      const data = await sheetsService.getSheetData(this.spreadsheetId, this.range);
      return this.filterAndFormatSalesData(data, startDate, endDate, filters);
    } catch (error) {
      logger.error('Failed to fetch sales data:', error);
      throw error;
    }
  }

  async getSalesSummary(startDate, endDate) {
    try {
      const data = await sheetsService.getSheetData(this.spreadsheetId, this.range);
      return this.calculateSalesSummary(data, startDate, endDate);
    } catch (error) {
      logger.error('Failed to fetch sales summary:', error);
      throw error;
    }
  }

  filterAndFormatSalesData(data, startDate, endDate, filters) {
    if (!data || data.length < 2) return [];

    const [headers, ...rows] = data;
    return rows
      .filter(row => this.matchesDateRange(row[6], startDate, endDate))
      .filter(row => this.matchesFilters(row, filters))
      .map(row => this.formatSaleRecord(row));
  }

  calculateSalesSummary(data, startDate, endDate) {
    if (!data || data.length < 2) {
      return this.getEmptySummary();
    }

    const [headers, ...rows] = data;
    const filteredRows = rows.filter(row => 
      this.matchesDateRange(row[6], startDate, endDate)
    );

    const totalAmount = filteredRows.reduce((sum, row) => sum + this.parseAmount(row[5]), 0);
    const totalTransactions = filteredRows.length;

    const customerStats = this.calculateCustomerStats(filteredRows);
    const dailyStats = this.calculateDailyStats(filteredRows);

    return {
      startDate,
      endDate,
      summary: {
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        totalTransactions,
        averageTransactionAmount: totalTransactions ? 
          parseFloat((totalAmount / totalTransactions).toFixed(2)) : 0,
        uniqueCustomers: customerStats.uniqueCustomers,
        repeatCustomers: customerStats.repeatCustomers
      },
      dailyStats,
      customerStats: customerStats.topCustomers
    };
  }

  matchesDateRange(dateStr, startDate, endDate) {
    if (!startDate && !endDate) return true;
    
    const date = new Date(dateStr);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return (!start || date >= start) && (!end || date <= end);
  }

  matchesFilters(row, filters) {
    return Object.entries(filters).every(([key, value]) => {
      switch (key) {
        case 'customerEmail':
          return row[4].toLowerCase() === value.toLowerCase();
        case 'customerName':
          return row[3].toLowerCase().includes(value.toLowerCase());
        case 'minAmount':
          return this.parseAmount(row[5]) >= parseFloat(value);
        case 'maxAmount':
          return this.parseAmount(row[5]) <= parseFloat(value);
        default:
          return true;
      }
    });
  }

  formatSaleRecord(row) {
    return {
      sessionId: row[0],
      chargeId: row[1],
      stripeCustomerId: row[2],
      customerName: row[3],
      customerEmail: row[4],
      amount: this.parseAmount(row[5]),
      date: row[6]
    };
  }

  calculateCustomerStats(rows) {
    const customerTransactions = {};
    
    rows.forEach(row => {
      const email = row[4];
      if (!customerTransactions[email]) {
        customerTransactions[email] = {
          customerName: row[3],
          email,
          totalAmount: 0,
          transactions: 0
        };
      }
      
      customerTransactions[email].totalAmount += this.parseAmount(row[5]);
      customerTransactions[email].transactions += 1;
    });

    const customers = Object.values(customerTransactions);
    const repeatCustomers = customers.filter(c => c.transactions > 1).length;

    return {
      uniqueCustomers: customers.length,
      repeatCustomers,
      topCustomers: customers
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10)
        .map(customer => ({
          customerName: customer.customerName,
          email: customer.email,
          totalAmount: parseFloat(customer.totalAmount.toFixed(2)),
          transactions: customer.transactions,
          averageTransactionAmount: parseFloat((customer.totalAmount / customer.transactions).toFixed(2))
        }))
    };
  }

  calculateDailyStats(rows) {
    const dailyData = {};
    
    rows.forEach(row => {
      const date = row[6].split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          totalAmount: 0,
          transactions: 0,
          uniqueCustomers: new Set()
        };
      }
      
      dailyData[date].totalAmount += this.parseAmount(row[5]);
      dailyData[date].transactions += 1;
      dailyData[date].uniqueCustomers.add(row[4]);
    });

    return Object.values(dailyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(day => ({
        date: day.date,
        totalAmount: parseFloat(day.totalAmount.toFixed(2)),
        transactions: day.transactions,
        uniqueCustomers: day.uniqueCustomers.size,
        averageTransactionAmount: parseFloat((day.totalAmount / day.transactions).toFixed(2))
      }));
  }

  parseAmount(amountStr) {
    // Remove currency symbol and convert to number
    const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ''));
    return isNaN(amount) ? 0 : amount;
  }

  getEmptySummary() {
    return {
      summary: {
        totalAmount: 0,
        totalTransactions: 0,
        averageTransactionAmount: 0,
        uniqueCustomers: 0,
        repeatCustomers: 0
      },
      dailyStats: [],
      customerStats: []
    };
  }
}

module.exports = new SalesService();