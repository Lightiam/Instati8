const express = require('express');
const { DatabaseModel } = require('./models');
const { checkAccessRules, setSecurityRules, getSecurityRules } = require('./security');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/:path(*)', authMiddleware, async (req, res) => {
  try {
    const path = `/${req.params.path}`;
    
    const canRead = await checkAccessRules(path, req.user.userId, 'read');
    if (!canRead) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const data = await DatabaseModel.getDataAtPath(path);
    res.json({ data });
  } catch (error) {
    logger.error(`Database GET error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:path(*)', authMiddleware, async (req, res) => {
  try {
    const path = `/${req.params.path}`;
    const { value, accessRules } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ message: 'Value is required' });
    }
    
    const canWrite = await checkAccessRules(path, req.user.userId, 'write');
    if (!canWrite) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    await DatabaseModel.setDataAtPath(path, value, req.user.userId, accessRules);
    
    logger.info(`Data set at path: ${path}`);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Database PUT error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/:path(*)', authMiddleware, async (req, res) => {
  try {
    const path = `/${req.params.path}`;
    const updates = req.body;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Updates are required' });
    }
    
    const canWrite = await checkAccessRules(path, req.user.userId, 'write');
    if (!canWrite) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const updatedData = await DatabaseModel.updateDataAtPath(path, updates, req.user.userId);
    
    logger.info(`Data updated at path: ${path}`);
    res.json({ success: true, data: updatedData });
  } catch (error) {
    logger.error(`Database PATCH error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:path(*)', authMiddleware, async (req, res) => {
  try {
    const path = `/${req.params.path}`;
    
    const canWrite = await checkAccessRules(path, req.user.userId, 'write');
    if (!canWrite) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    await DatabaseModel.deleteDataAtPath(path);
    
    logger.info(`Data deleted at path: ${path}`);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Database DELETE error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/rules/:path(*)', authMiddleware, async (req, res) => {
  try {
    const path = `/${req.params.path}`;
    
    const canRead = await checkAccessRules(path, req.user.userId, 'read');
    if (!canRead) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const rulesData = await getSecurityRules(path);
    res.json(rulesData);
  } catch (error) {
    logger.error(`Rules GET error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/rules/:path(*)', authMiddleware, async (req, res) => {
  try {
    const path = `/${req.params.path}`;
    const rules = req.body;
    
    if (Object.keys(rules).length === 0) {
      return res.status(400).json({ message: 'Rules are required' });
    }
    
    const canWrite = await checkAccessRules(path, req.user.userId, 'write');
    if (!canWrite) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    await setSecurityRules(path, rules, req.user.userId);
    
    logger.info(`Security rules set for path: ${path}`);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Rules PUT error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
