const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UserModel } = require('./models');
const config = require('../../config/default');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, metadata } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await UserModel.create({
      email,
      password: hashedPassword,
      metadata
    });
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
    
    logger.info(`User registered: ${email}`);
    
    res.status(201).json({ 
      userId: user.id, 
      token,
      refreshToken
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    
    if (error.message === 'User already exists') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
    
    logger.info(`User logged in: ${email}`);
    
    res.json({ 
      userId: user.id, 
      token,
      refreshToken
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }
    
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
    
    logger.info(`Token refreshed for user: ${user.email}`);
    
    res.json({ 
      token,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error(`Token refresh error: ${error.message}`);
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.put('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, metadata } = req.body;
    
    const user = await UserModel.update(id, { email, metadata });
    
    logger.info(`User updated: ${id}`);
    
    res.json({ 
      userId: user.id, 
      email: user.email,
      metadata: user.metadata
    });
  } catch (error) {
    logger.error(`User update error: ${error.message}`);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await UserModel.delete(id);
    
    logger.info(`User deleted: ${id}`);
    
    res.json({ message: 'User deleted' });
  } catch (error) {
    logger.error(`User deletion error: ${error.message}`);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
