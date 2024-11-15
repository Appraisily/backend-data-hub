const chatService = require('../services/chat.service');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const getChats = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const chats = await chatService.getChats(startDate, endDate, status);
    
    res.json({
      success: true,
      data: chats,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Chat retrieval error:', error);
    handleError(res, error);
  }
};

const getChatSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await chatService.getChatSummary(startDate, endDate);
    
    res.json({
      success: true,
      data: summary,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Chat summary error:', error);
    handleError(res, error);
  }
};

const getAgentPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const performance = await chatService.getAgentPerformance(startDate, endDate);
    
    res.json({
      success: true,
      data: performance,
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Agent performance error:', error);
    handleError(res, error);
  }
};

module.exports = {
  getChats,
  getChatSummary,
  getAgentPerformance
};