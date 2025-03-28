const Redis = require('ioredis');
const config = require('../../config/default');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db
});

class UserModel {
  static async create(userData) {
    const { email, password, metadata = {} } = userData;
    
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    const userId = `user:${Date.now()}:${Math.random().toString(36).substring(2, 15)}`;
    
    const user = {
      id: userId,
      email,
      password,
      createdAt: Date.now(),
      metadata: JSON.stringify(metadata)
    };
    
    await redis.hmset(`users:${userId}`, user);
    
    await redis.set(`users:email:${email}`, userId);
    
    return user;
  }
  
  static async findByEmail(email) {
    const userId = await redis.get(`users:email:${email}`);
    
    if (!userId) {
      return null;
    }
    
    const user = await redis.hgetall(`users:${userId}`);
    
    if (Object.keys(user).length === 0) {
      return null;
    }
    
    if (user.metadata) {
      try {
        user.metadata = JSON.parse(user.metadata);
      } catch (error) {
        user.metadata = {};
      }
    }
    
    return user;
  }
  
  static async findById(id) {
    const user = await redis.hgetall(`users:${id}`);
    
    if (Object.keys(user).length === 0) {
      return null;
    }
    
    if (user.metadata) {
      try {
        user.metadata = JSON.parse(user.metadata);
      } catch (error) {
        user.metadata = {};
      }
    }
    
    return user;
  }
  
  static async update(id, userData) {
    const user = await this.findById(id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const { email, metadata } = userData;
    
    const updatedUser = {
      ...user,
      email: email || user.email,
      metadata: JSON.stringify(metadata || user.metadata),
      updatedAt: Date.now()
    };
    
    if (email && email !== user.email) {
      await redis.del(`users:email:${user.email}`);
      await redis.set(`users:email:${email}`, id);
    }
    
    await redis.hmset(`users:${id}`, updatedUser);
    
    return updatedUser;
  }
  
  static async delete(id) {
    const user = await this.findById(id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    await redis.del(`users:email:${user.email}`);
    
    await redis.del(`users:${id}`);
    
    return true;
  }
}

module.exports = { UserModel };
