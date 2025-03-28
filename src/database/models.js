const Redis = require('ioredis');
const config = require('../../config/default');
const logger = require('../utils/logger');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db
});

const redisSub = redis.duplicate();

class DatabaseModel {
  static async getDataAtPath(path) {
    const dataKey = `data:${path}`;
    
    const exists = await redis.exists(dataKey);
    
    if (exists) {
      const data = await redis.hgetall(dataKey);
      
      if (data.value) {
        try {
          return JSON.parse(data.value);
        } catch (error) {
          return data.value;
        }
      }
      
      return null;
    }
    
    const pattern = `data:${path}/*`;
    const childKeys = await redis.keys(pattern);
    
    if (childKeys.length === 0) {
      return null;
    }
    
    const result = {};
    
    for (const key of childKeys) {
      const childPath = key.replace('data:', '');
      const childName = childPath.replace(`${path}/`, '').split('/')[0];
      
      if (!result[childName]) {
        const childData = await redis.hgetall(key);
        
        if (childData.value) {
          try {
            result[childName] = JSON.parse(childData.value);
          } catch (error) {
            result[childName] = childData.value;
          }
        } else {
          result[childName] = {};
        }
      }
    }
    
    return result;
  }
  
  static async setDataAtPath(path, value, userId, accessRules = null) {
    const dataKey = `data:${path}`;
    
    await redis.hmset(dataKey, {
      value: JSON.stringify(value),
      owner: userId,
      updatedAt: Date.now()
    });
    
    if (accessRules) {
      const rulesKey = `rules:${path}`;
      
      await redis.del(rulesKey);
      
      const ruleEntries = Object.entries(accessRules).map(([key, value]) => [key, value]);
      if (ruleEntries.length > 0) {
        await redis.hmset(rulesKey, ...ruleEntries.flat());
      }
    }
    
    const channel = `rtdb:${path}`;
    await redis.publish(channel, JSON.stringify(value));
    
    return true;
  }
  
  static async updateDataAtPath(path, updates, userId) {
    const dataKey = `data:${path}`;
    
    const existingData = await redis.hget(dataKey, 'value');
    let value;
    
    if (existingData) {
      try {
        value = JSON.parse(existingData);
        
        if (typeof value === 'object' && value !== null) {
          value = { ...value, ...updates };
        } else {
          value = updates;
        }
      } catch (error) {
        value = updates;
      }
    } else {
      value = updates;
    }
    
    await redis.hmset(dataKey, {
      value: JSON.stringify(value),
      updatedAt: Date.now()
    });
    
    const channel = `rtdb:${path}`;
    await redis.publish(channel, JSON.stringify(value));
    
    return value;
  }
  
  static async deleteDataAtPath(path) {
    const pattern = `data:${path}*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    const rulesPattern = `rules:${path}*`;
    const rulesKeys = await redis.keys(rulesPattern);
    
    if (rulesKeys.length > 0) {
      await redis.del(...rulesKeys);
    }
    
    const channel = `rtdb:${path}`;
    await redis.publish(channel, 'null');
    
    return true;
  }
}

module.exports = { DatabaseModel, redis, redisSub };
