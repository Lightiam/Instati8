const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UserModel } = require('./models');
const config = require('../../config/default');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, firstName, lastName, metadata } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await UserModel.create({
      email,
      password: hashedPassword,
      displayName,
      firstName,
      lastName,
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
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      verified: user.verified,
      verificationToken: user.verificationToken,
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
      displayName: user.displayName || email.split('@')[0],
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      verified: user.verified === 'true',
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

router.post('/verify', async (req, res) => {
  try {
    const { userId, verificationToken } = req.body;
    
    if (!userId || !verificationToken) {
      return res.status(400).json({ message: 'User ID and verification token are required' });
    }
    
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.verified === 'true') {
      return res.status(400).json({ message: 'User is already verified' });
    }
    
    if (user.verificationToken !== verificationToken) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    
    await UserModel.update(userId, { verified: 'true' });
    
    logger.info(`User verified: ${user.email}`);
    
    res.json({ message: 'User verified successfully' });
  } catch (error) {
    logger.error(`Verification error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
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
