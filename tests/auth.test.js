const request = require('supertest');
const Redis = require('ioredis-mock');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('ioredis', () => require('ioredis-mock'));

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
const { UserModel } = require('../src/auth');

describe('Authentication API', () => {
  beforeEach(async () => {
    const redis = new Redis();
    const keys = await redis.keys('users:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  });
  
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('userId');
      
      const decoded = jwt.verify(res.body.token, 'test_jwt_secret');
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email', 'test@example.com');
    });
    
    it('should not register a user with an existing email', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userId = 'user:123456';
      
      const redis = new Redis();
      await redis.hmset(`users:${userId}`, {
        id: userId,
        email: 'test@example.com',
        password: hashedPassword
      });
      await redis.set('users:email:test@example.com', userId);
      
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'User already exists');
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userId = 'user:123456';
      
      const redis = new Redis();
      await redis.hmset(`users:${userId}`, {
        id: userId,
        email: 'test@example.com',
        password: hashedPassword
      });
      await redis.set('users:email:test@example.com', userId);
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('userId', userId);
      
      const decoded = jwt.verify(res.body.token, 'test_jwt_secret');
      expect(decoded).toHaveProperty('userId', userId);
      expect(decoded).toHaveProperty('email', 'test@example.com');
    });
    
    it('should not login with invalid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userId = 'user:123456';
      
      const redis = new Redis();
      await redis.hmset(`users:${userId}`, {
        id: userId,
        email: 'test@example.com',
        password: hashedPassword
      });
      await redis.set('users:email:test@example.com', userId);
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });
  });
  
  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token with valid refresh token', async () => {
      const userId = 'user:123456';
      
      const redis = new Redis();
      await redis.hmset(`users:${userId}`, {
        id: userId,
        email: 'test@example.com'
      });
      
      const refreshToken = jwt.sign(
        { userId, email: 'test@example.com' },
        'test_refresh_token_secret',
        { expiresIn: 2592000 }
      );
      
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
      
      const decoded = jwt.verify(res.body.token, 'test_jwt_secret');
      expect(decoded).toHaveProperty('userId', userId);
      expect(decoded).toHaveProperty('email', 'test@example.com');
    });
  });
});
