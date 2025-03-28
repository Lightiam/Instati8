const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'instatiate_jwt_secret_key',
    expiresIn: parseInt(process.env.JWT_EXPIRATION) || 3600,
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'instatiate_refresh_token_secret',
    refreshExpiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRATION) || 2592000
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },
  staticHosting: {
    enabled: process.env.ENABLE_STATIC_HOSTING === 'true',
    path: process.env.STATIC_FILES_PATH || './public'
  }
};
