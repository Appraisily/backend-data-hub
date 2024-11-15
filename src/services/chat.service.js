const { google } = require('googleapis');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

class ChatService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.gmail = google.gmail('v1');
    this.chatEmail = 'chat@appraisily.com';
    this.initializeClient();
  }

  async initializeClient() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/gmail.readonly']
      });
      
      this.client = await auth.getClient();
      google.options({ auth: this.client });
      logger.info('Gmail API client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gmail client:', error);
      throw error;
    }
  }

  async getChats(startDate, endDate) {
    const cacheKey = `chats_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const query = this.buildSearchQuery(startDate, endDate);
      const messages = await this.fetchEmails(query);
      const chats = await this.processChats(messages);
      
      this.cache.set(cacheKey, chats);
      return chats;
    } catch (error) {
      logger.error('Failed to fetch chat transcripts:', error);
      throw error;
    }
  }

  async getChatSummary(startDate, endDate) {
    const cacheKey = `chat_summary_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const chats = await this.getChats(startDate, endDate);
      const summary = this.calculateChatMetrics(chats);
      
      this.cache.set(cacheKey, summary);
      return summary;
    } catch (error) {
      logger.error('Failed to generate chat summary:', error);
      throw error;
    }
  }

  async getAgentPerformance(startDate, endDate) {
    const cacheKey = `agent_performance_${startDate}_${endDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const chats = await this.getChats(startDate, endDate);
      const performance = this.calculateAgentMetrics(chats);
      
      this.cache.set(cacheKey, performance);
      return performance;
    } catch (error) {
      logger.error('Failed to generate agent performance metrics:', error);
      throw error;
    }
  }

  buildSearchQuery(startDate, endDate) {
    const after = new Date(startDate).getTime() / 1000;
    const before = new Date(endDate).getTime() / 1000;
    return `to:${this.chatEmail} after:${after} before:${before}`;
  }

  async fetchEmails(query) {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500
    });

    if (!response.data.messages) {
      return [];
    }

    const messages = await Promise.all(
      response.data.messages.map(msg => 
        this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        })
      )
    );

    return messages.map(msg => msg.data);
  }

  async processChats(messages) {
    return messages.map(message => {
      const headers = message.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      const transcript = this.extractTranscript(message);
      const metrics = this.analyzeTranscript(transcript);

      return {
        chatId: message.id,
        subject,
        customerEmail: this.extractEmail(from),
        customerName: this.extractName(from),
        date: new Date(date).toISOString(),
        transcript,
        metrics
      };
    });
  }

  extractTranscript(message) {
    let body = '';
    
    if (message.payload.parts) {
      const textPart = message.payload.parts.find(part => 
        part.mimeType === 'text/plain'
      );
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    } else if (message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    }

    return body;
  }

  analyzeTranscript(transcript) {
    const lines = transcript.split('\n').filter(line => line.trim());
    const messages = this.parseMessages(lines);
    
    return {
      messageCount: messages.length,
      duration: this.calculateDuration(messages),
      firstResponseTime: this.calculateFirstResponseTime(messages),
      averageResponseTime: this.calculateAverageResponseTime(messages),
      customerMessages: messages.filter(m => m.type === 'customer').length,
      agentMessages: messages.filter(m => m.type === 'agent').length
    };
  }

  parseMessages(lines) {
    return lines.map(line => {
      const timestamp = this.extractTimestamp(line);
      const isAgent = line.includes('Agent:');
      
      return {
        timestamp,
        type: isAgent ? 'agent' : 'customer',
        content: line
      };
    }).filter(msg => msg.timestamp);
  }

  calculateDuration(messages) {
    if (messages.length < 2) return 0;
    
    const start = new Date(messages[0].timestamp);
    const end = new Date(messages[messages.length - 1].timestamp);
    return Math.round((end - start) / 1000); // Duration in seconds
  }

  calculateFirstResponseTime(messages) {
    const customerMessage = messages.find(m => m.type === 'customer');
    const agentResponse = messages.find(m => m.type === 'agent');
    
    if (!customerMessage || !agentResponse) return 0;
    
    const start = new Date(customerMessage.timestamp);
    const response = new Date(agentResponse.timestamp);
    return Math.round((response - start) / 1000); // Time in seconds
  }

  calculateAverageResponseTime(messages) {
    const responseTimes = [];
    let lastCustomerMessage = null;
    
    messages.forEach(message => {
      if (message.type === 'customer') {
        lastCustomerMessage = message;
      } else if (lastCustomerMessage) {
        const responseTime = 
          (new Date(message.timestamp) - new Date(lastCustomerMessage.timestamp)) / 1000;
        responseTimes.push(responseTime);
        lastCustomerMessage = null;
      }
    });

    return responseTimes.length ? 
      Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length) : 0;
  }

  calculateChatMetrics(chats) {
    const totalChats = chats.length;
    if (totalChats === 0) return this.getEmptyChatMetrics();

    const metrics = chats.reduce((acc, chat) => {
      acc.totalMessages += chat.metrics.messageCount;
      acc.totalDuration += chat.metrics.duration;
      acc.totalFirstResponseTime += chat.metrics.firstResponseTime;
      acc.totalResponseTime += chat.metrics.averageResponseTime;
      return acc;
    }, {
      totalMessages: 0,
      totalDuration: 0,
      totalFirstResponseTime: 0,
      totalResponseTime: 0
    });

    return {
      totalChats,
      averageMessages: Math.round(metrics.totalMessages / totalChats),
      averageDuration: Math.round(metrics.totalDuration / totalChats),
      averageFirstResponseTime: Math.round(metrics.totalFirstResponseTime / totalChats),
      averageResponseTime: Math.round(metrics.totalResponseTime / totalChats),
      chatsByDay: this.aggregateChatsByDay(chats)
    };
  }

  calculateAgentMetrics(chats) {
    const agentStats = {};

    chats.forEach(chat => {
      const agentId = this.extractAgentId(chat.transcript);
      if (!agentId) return;

      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          agentId,
          totalChats: 0,
          totalMessages: 0,
          totalResponseTime: 0,
          totalFirstResponseTime: 0
        };
      }

      const stats = agentStats[agentId];
      stats.totalChats++;
      stats.totalMessages += chat.metrics.agentMessages;
      stats.totalResponseTime += chat.metrics.averageResponseTime;
      stats.totalFirstResponseTime += chat.metrics.firstResponseTime;
    });

    return Object.values(agentStats).map(stats => ({
      agentId: stats.agentId,
      totalChats: stats.totalChats,
      averageMessages: Math.round(stats.totalMessages / stats.totalChats),
      averageResponseTime: Math.round(stats.totalResponseTime / stats.totalChats),
      averageFirstResponseTime: Math.round(stats.totalFirstResponseTime / stats.totalChats)
    }));
  }

  aggregateChatsByDay(chats) {
    const chatsByDay = {};

    chats.forEach(chat => {
      const date = chat.date.split('T')[0];
      if (!chatsByDay[date]) {
        chatsByDay[date] = {
          date,
          totalChats: 0,
          totalMessages: 0,
          averageResponseTime: 0
        };
      }

      const dayStats = chatsByDay[date];
      dayStats.totalChats++;
      dayStats.totalMessages += chat.metrics.messageCount;
      dayStats.averageResponseTime += chat.metrics.averageResponseTime;
    });

    return Object.values(chatsByDay)
      .map(day => ({
        ...day,
        averageResponseTime: Math.round(day.averageResponseTime / day.totalChats)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getEmptyChatMetrics() {
    return {
      totalChats: 0,
      averageMessages: 0,
      averageDuration: 0,
      averageFirstResponseTime: 0,
      averageResponseTime: 0,
      chatsByDay: []
    };
  }

  extractEmail(from) {
    const match = from.match(/<(.+?)>/);
    return match ? match[1] : from;
  }

  extractName(from) {
    const match = from.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : '';
  }

  extractTimestamp(line) {
    const match = line.match(/\[(.*?)\]/);
    return match ? match[1] : null;
  }

  extractAgentId(transcript) {
    const match = transcript.match(/Agent ID: (\w+)/);
    return match ? match[1] : null;
  }
}

module.exports = new ChatService();