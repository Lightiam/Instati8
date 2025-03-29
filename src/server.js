const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const config = require('../config/default');
const logger = require('./utils/logger');

dotenv.config();

const app = express();
const server = http.createServer(app);

const { setupWebSockets } = require('./database/websocket');
const { io, rtdbNamespace } = setupWebSockets(server);

app.locals.io = io;
app.locals.rtdbNamespace = rtdbNamespace;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.socket.io", "js.stripe.com"],
      connectSrc: ["'self'", "localhost:*", "ws://localhost:*", "api.stripe.com"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      frameSrc: ["'self'", "hooks.stripe.com", "js.stripe.com", "checkout.stripe.com"]
    }
  }
}));
app.use(cors({
  origin: config.security.corsOrigin
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: config.security.rateLimitWindow * 60 * 1000, // Convert minutes to milliseconds
  max: config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use('/api/auth', require('./auth/routes'));
app.use('/api/database', require('./database/routes'));
app.use('/api/ai', require('./ai/routes/aiRoutes'));
app.use('/api/payment', require('./payment/routes'));

if (config.staticHosting.enabled) {
  app.use(express.static(config.staticHosting.path));
  logger.info(`Static file hosting enabled from ${config.staticHosting.path}`);
}

app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ message: 'Server error', error: err.message });
});

const PORT = config.server.port;
server.listen(PORT, () => {
  logger.info(`Server running in ${config.server.env} mode on port ${PORT}`);
});

module.exports = { app, server };
