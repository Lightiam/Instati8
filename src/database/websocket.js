const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { redisSub } = require('./models');
const { checkAccessRules } = require('./security');
const { DatabaseModel } = require('./models');
const config = require('../../config/default');
const logger = require('../utils/logger');

const setupWebSockets = (server) => {
  const io = socketIO(server);
  
  const rtdbNamespace = io.of('/rtdb');
  
  rtdbNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });
  
  rtdbNamespace.on('connection', (socket) => {
    logger.info(`User ${socket.user.userId} connected`);
    const userSubscriptions = new Set();
    
    socket.on('subscribe', async (path) => {
      try {
        const canRead = await checkAccessRules(path, socket.user.userId, 'read');
        
        if (!canRead) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }
        
        const channel = `rtdb:${path}`;
        
        redisSub.subscribe(channel);
        userSubscriptions.add(channel);
        
        socket.join(path);
        logger.info(`User ${socket.user.userId} subscribed to ${path}`);
        
        const data = await DatabaseModel.getDataAtPath(path);
        socket.emit('data_update', { path, data });
      } catch (error) {
        logger.error(`Subscription error: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });
    
    socket.on('unsubscribe', (path) => {
      const channel = `rtdb:${path}`;
      
      if (userSubscriptions.has(channel)) {
        redisSub.unsubscribe(channel);
        userSubscriptions.delete(channel);
      }
      
      socket.leave(path);
      logger.info(`User ${socket.user.userId} unsubscribed from ${path}`);
    });
    
    socket.on('disconnect', () => {
      for (const channel of userSubscriptions) {
        redisSub.unsubscribe(channel);
      }
      
      logger.info(`User ${socket.user.userId} disconnected`);
    });
  });
  
  redisSub.on('message', (channel, message) => {
    const path = channel.replace('rtdb:', '');
    let data;
    
    try {
      data = JSON.parse(message);
    } catch (error) {
      data = message === 'null' ? null : message;
    }
    
    rtdbNamespace.to(path).emit('data_update', { path, data });
  });
  
  return { io, rtdbNamespace };
};

module.exports = { setupWebSockets };
