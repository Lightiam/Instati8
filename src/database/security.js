const { redis } = require('./models');
const logger = require('../utils/logger');

const checkAccessRules = async (path, userId, operation) => {
  const rulesKey = `rules:${path}`;
  
  const rules = await redis.hgetall(rulesKey);
  
  if (Object.keys(rules).length === 0) {
    const pathParts = path.split('/').filter(Boolean);
    
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const parentPath = '/' + pathParts.slice(0, i).join('/');
      const parentRulesKey = `rules:${parentPath}`;
      const parentRules = await redis.hgetall(parentRulesKey);
      
      if (Object.keys(parentRules).length > 0) {
        return checkRulePermission(parentRules, userId, operation);
      }
    }
    
    const rootRules = await redis.hgetall('rules:/');
    if (Object.keys(rootRules).length > 0) {
      return checkRulePermission(rootRules, userId, operation);
    }
    
    const owner = await redis.hget(`data:${path}`, 'owner');
    return owner === userId;
  }
  
  return checkRulePermission(rules, userId, operation);
};

const checkRulePermission = (rules, userId, operation) => {
  if (rules.owner === userId) {
    return true;
  }
  
  if (rules.public === 'true') {
    if (operation === 'read' && rules.publicRead === 'true') {
      return true;
    }
    
    if (operation === 'write' && rules.publicWrite === 'true') {
      return true;
    }
  }
  
  const userRule = rules[`user:${userId}`];
  if (userRule) {
    if (operation === 'read' && (userRule === 'read' || userRule === 'readwrite')) {
      return true;
    }
    
    if (operation === 'write' && userRule === 'readwrite') {
      return true;
    }
  }
  
  return false;
};

const setSecurityRules = async (path, rules, userId) => {
  try {
    const rulesKey = `rules:${path}`;
    
    await redis.del(rulesKey);
    
    if (!rules.owner) {
      rules.owner = userId;
    }
    
    const ruleEntries = Object.entries(rules).map(([key, value]) => [key, value]);
    if (ruleEntries.length > 0) {
      await redis.hmset(rulesKey, ...ruleEntries.flat());
      logger.info(`Security rules set for path: ${path}`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error(`Error setting security rules: ${error.message}`);
    throw error;
  }
};

const getSecurityRules = async (path) => {
  try {
    const rulesKey = `rules:${path}`;
    
    const rules = await redis.hgetall(rulesKey);
    
    if (Object.keys(rules).length === 0) {
      const pathParts = path.split('/').filter(Boolean);
      
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const parentPath = '/' + pathParts.slice(0, i).join('/');
        const parentRulesKey = `rules:${parentPath}`;
        const parentRules = await redis.hgetall(parentRulesKey);
        
        if (Object.keys(parentRules).length > 0) {
          return { rules: parentRules, inheritedFrom: parentPath };
        }
      }
      
      const rootRules = await redis.hgetall('rules:/');
      if (Object.keys(rootRules).length > 0) {
        return { rules: rootRules, inheritedFrom: '/' };
      }
      
      return { rules: {}, inheritedFrom: null };
    }
    
    return { rules, inheritedFrom: null };
  } catch (error) {
    logger.error(`Error getting security rules: ${error.message}`);
    throw error;
  }
};

module.exports = {
  checkAccessRules,
  setSecurityRules,
  getSecurityRules
};
