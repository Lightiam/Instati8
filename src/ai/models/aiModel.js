const { promisify } = require('util');
const redis = require('redis');
const config = require('../../../config/default');
const logger = require('../../utils/logger');

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db
});

const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);
const expireAsync = promisify(redisClient.expire).bind(redisClient);

class AIModel {
  static async createConversation(userId) {
    try {
      const conversationId = `ai:conversation:${Date.now()}:${Math.random().toString(36).substring(2, 15)}`;
      
      const conversation = {
        id: conversationId,
        userId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await setAsync(`ai:${conversationId}`, JSON.stringify(conversation));
      await expireAsync(`ai:${conversationId}`, 86400 * 7); // Expire after 7 days
      
      return conversationId;
    } catch (error) {
      logger.error(`Error creating AI conversation: ${error.message}`);
      throw error;
    }
  }
  
  static async getConversation(conversationId) {
    try {
      const conversation = await getAsync(`ai:${conversationId}`);
      
      if (!conversation) {
        return null;
      }
      
      return JSON.parse(conversation);
    } catch (error) {
      logger.error(`Error getting AI conversation: ${error.message}`);
      throw error;
    }
  }
  
  static async addMessage(conversationId, message, isUser = true) {
    try {
      const conversation = await this.getConversation(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      conversation.messages.push({
        content: message,
        isUser,
        timestamp: Date.now()
      });
      
      conversation.updatedAt = Date.now();
      
      await setAsync(`ai:${conversationId}`, JSON.stringify(conversation));
      await expireAsync(`ai:${conversationId}`, 86400 * 7); // Reset expiration to 7 days
      
      return conversation;
    } catch (error) {
      logger.error(`Error adding message to AI conversation: ${error.message}`);
      throw error;
    }
  }
  
  static async deleteConversation(conversationId) {
    try {
      await delAsync(`ai:${conversationId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting AI conversation: ${error.message}`);
      throw error;
    }
  }
  
  static async getUserConversations(userId) {
    try {
      return [];
    } catch (error) {
      logger.error(`Error getting user AI conversations: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AIModel;
