const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const authMiddleware = require('../../middleware/auth');
const logger = require('../../utils/logger');

const checkRateLimit = (req, res, next) => {
  next();
};

router.post('/conversation', authMiddleware, checkRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const conversationId = await AIService.createConversation(userId);
    
    logger.info(`AI conversation created: ${conversationId}`);
    
    res.status(201).json({ conversationId });
  } catch (error) {
    logger.error(`Error creating AI conversation: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/conversation/:id', authMiddleware, async (req, res) => {
  try {
    const conversationId = req.params.id;
    
    const conversation = await AIService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(conversation);
  } catch (error) {
    logger.error(`Error getting AI conversation: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/conversation/:id', authMiddleware, checkRateLimit, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    const conversation = await AIService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const response = await AIService.processMessage(conversationId, message);
    
    logger.info(`AI message processed for conversation: ${conversationId}`);
    
    res.json({ response });
  } catch (error) {
    logger.error(`Error processing AI message: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/conversation/:id', authMiddleware, async (req, res) => {
  try {
    const conversationId = req.params.id;
    
    const conversation = await AIService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await AIService.deleteConversation(conversationId);
    
    logger.info(`AI conversation deleted: ${conversationId}`);
    
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    logger.error(`Error deleting AI conversation: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/create-database', authMiddleware, checkRateLimit, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    
    const response = AIService.generateDatabaseStructure(prompt);
    
    logger.info(`AI database structure generated for user: ${req.user.id}`);
    
    res.json(response);
  } catch (error) {
    logger.error(`Error generating AI database structure: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/generate-query', authMiddleware, checkRateLimit, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    
    const response = AIService.generateDatabaseQuery(prompt);
    
    logger.info(`AI query generated for user: ${req.user.id}`);
    
    res.json(response);
  } catch (error) {
    logger.error(`Error generating AI query: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/generate-update', authMiddleware, checkRateLimit, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    
    const response = AIService.generateDatabaseUpdate(prompt);
    
    logger.info(`AI update generated for user: ${req.user.id}`);
    
    res.json(response);
  } catch (error) {
    logger.error(`Error generating AI update: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/analyze-structure', authMiddleware, checkRateLimit, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    const response = AIService.analyzeDatabaseStructure(prompt || 'Analyze my database');
    
    logger.info(`AI database analysis generated for user: ${req.user.id}`);
    
    res.json(response);
  } catch (error) {
    logger.error(`Error generating AI database analysis: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
