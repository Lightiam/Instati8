const request = require('supertest');
const Redis = require('ioredis-mock');
const jwt = require('jsonwebtoken');

jest.mock('ioredis', () => require('ioredis-mock'));
jest.mock('socket.io', () => {
  return function() {
    return {
      of: jest.fn().mockReturnThis(),
      use: jest.fn(),
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };
  };
});

jest.mock('../config/default', () => ({
  server: {
    port: 3000,
    env: 'test'
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: '',
    db: 0
  },
  jwt: {
    secret: 'test_jwt_secret',
    expiresIn: 3600,
    refreshSecret: 'test_refresh_token_secret',
    refreshExpiresIn: 2592000
  },
  logging: {
    level: 'error',
    format: 'combined'
  },
  security: {
    corsOrigin: '*',
    rateLimitWindow: 15,
    rateLimitMax: 100
  },
  staticHosting: {
    enabled: false,
    path: './public'
  }
}));

const { app } = require('../src/server');
const { DatabaseModel, redis } = require('../src/database');

describe('Database API', () => {
  let token;
  const userId = 'user:123456';
  
  beforeEach(async () => {
    const redisClient = new Redis();
    const keys = await redisClient.keys('*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    
    token = jwt.sign(
      { userId, email: 'test@example.com' },
      'test_jwt_secret',
      { expiresIn: 3600 }
    );
  });
  
  describe('GET /api/database/:path', () => {
    it('should get data at path', async () => {
      await redis.hmset('data:/test', {
        value: JSON.stringify({ name: 'Test Data' }),
        owner: userId,
        updatedAt: Date.now()
      });
      
      const res = await request(app)
        .get('/api/database/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('name', 'Test Data');
    });
    
    it('should return null for non-existent path', async () => {
      const res = await request(app)
        .get('/api/database/nonexistent')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data', null);
    });
  });
  
  describe('PUT /api/database/:path', () => {
    it('should set data at path', async () => {
      const res = await request(app)
        .put('/api/database/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: { name: 'New Data' } });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      
      const data = await redis.hget('data:/test', 'value');
      expect(JSON.parse(data)).toEqual({ name: 'New Data' });
    });
    
    it('should set data with access rules', async () => {
      const res = await request(app)
        .put('/api/database/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ 
          value: { name: 'New Data' },
          accessRules: { 
            public: 'true',
            publicRead: 'true'
          } 
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      
      const rules = await redis.hgetall('rules:/test');
      expect(rules).toHaveProperty('public', 'true');
      expect(rules).toHaveProperty('publicRead', 'true');
    });
  });
  
  describe('PATCH /api/database/:path', () => {
    it('should update data at path', async () => {
      await redis.hmset('data:/test', {
        value: JSON.stringify({ name: 'Test Data', count: 1 }),
        owner: userId,
        updatedAt: Date.now()
      });
      
      const res = await request(app)
        .patch('/api/database/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ count: 2 });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('name', 'Test Data');
      expect(res.body.data).toHaveProperty('count', 2);
      
      const data = await redis.hget('data:/test', 'value');
      expect(JSON.parse(data)).toEqual({ name: 'Test Data', count: 2 });
    });
  });
  
  describe('DELETE /api/database/:path', () => {
    it('should delete data at path', async () => {
      await redis.hmset('data:/test', {
        value: JSON.stringify({ name: 'Test Data' }),
        owner: userId,
        updatedAt: Date.now()
      });
      
      const res = await request(app)
        .delete('/api/database/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      
      const exists = await redis.exists('data:/test');
      expect(exists).toEqual(0);
    });
  });
  
  describe('Security Rules', () => {
    it('should get security rules for a path', async () => {
      await redis.hmset('rules:/test', {
        owner: userId,
        public: 'true',
        publicRead: 'true'
      });
      
      const res = await request(app)
        .get('/api/database/rules/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('rules');
      expect(res.body.rules).toHaveProperty('owner', userId);
      expect(res.body.rules).toHaveProperty('public', 'true');
      expect(res.body.rules).toHaveProperty('publicRead', 'true');
    });
    
    it('should set security rules for a path', async () => {
      const res = await request(app)
        .put('/api/database/rules/test')
        .set('Authorization', `Bearer ${token}`)
        .send({
          public: 'true',
          publicRead: 'true',
          publicWrite: 'false'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      
      const rules = await redis.hgetall('rules:/test');
      expect(rules).toHaveProperty('owner', userId);
      expect(rules).toHaveProperty('public', 'true');
      expect(rules).toHaveProperty('publicRead', 'true');
      expect(rules).toHaveProperty('publicWrite', 'false');
    });
  });
});
