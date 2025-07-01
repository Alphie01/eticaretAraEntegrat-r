const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// Import models properly
const { User } = require('../../models');
const { Op } = require('sequelize');

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    // Create JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    res.status(statusCode).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id || 1,
        is_active: user.is_active || true
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    logger.error('SendTokenResponse failed:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating authentication token: ' + error.message
    });
  }
};

const router = express.Router();

// Debug test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth route is working',
    timestamp: new Date().toISOString()
  });
});

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, company } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password_hash: password, // Sequelize field name
      role_id: 1 // Default role
    });

    logger.info(`New user registered: ${email}`);
    sendTokenResponse(user, 201, res);
  } catch (error) {
    logger.error('User registration failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ 
      where: { email },
      attributes: { include: ['password_hash'] }
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        error: 'Account temporarily locked due to too many failed login attempts'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (user.login_attempts > 0) {
      await user.update({
        login_attempts: 0,
        lock_until: null
      });
    }

    logger.info(`User logged in: ${email}`);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('User login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/me
// @access  Private
router.put('/me', protect, async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      company: req.body.company,
      preferences: req.body.preferences
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    await user.update(fieldsToUpdate);

    logger.info(`User profile updated: ${user.email}`);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Profile update failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
router.put('/updatepassword', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password'
      });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: { include: ['password_hash'] }
    });

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    user.password_hash = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('Password update failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
router.post('/forgotpassword', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this email'
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // TODO: Send email with reset token
    // For now, we'll just return the token (remove this in production)
    logger.info(`Password reset requested for: ${email}`);
    
    res.status(200).json({
      success: true,
      message: 'Password reset token sent',
      resetToken // Remove this in production
    });
  } catch (error) {
    logger.error('Forgot password failed:', error);
    res.status(500).json({
      success: false,
      error: 'Email could not be sent'
    });
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
router.put('/resetpassword/:resettoken', async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    let user;
    if (Op) {
      user = await User.findOne({
        where: {
          reset_password_token: resetPasswordToken,
          reset_password_expire: { [Op.gt]: new Date() }
        }
      });
    } else {
      // Demo mode fallback
      user = null;
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password_hash = req.body.password;
    user.reset_password_token = null;
    user.reset_password_expire = null;
    
    await user.save();

    logger.info(`Password reset completed for user: ${user.email}`);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('Password reset failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
router.get('/logout', protect, async (req, res) => {
  logger.info(`User logged out: ${req.user.email}`);
  
  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

// @desc    Add marketplace account
// @route   POST /api/v1/auth/marketplace
// @access  Private
router.post('/marketplace', protect, async (req, res) => {
  try {
    const { marketplace, credentials, settings } = req.body;

    // Validate marketplace
    const validMarketplaces = ['trendyol', 'hepsiburada', 'amazon', 'n11'];
    if (!validMarketplaces.includes(marketplace)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid marketplace'
      });
    }

    // TODO: Implement Sequelize marketplace accounts
    // For now, return demo response
    logger.info(`Marketplace account configuration attempted: ${marketplace} for user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: `${marketplace} account configuration saved (demo mode)`
    });
  } catch (error) {
    logger.error('Marketplace account configuration failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Get marketplace accounts
// @route   GET /api/v1/auth/marketplace
// @access  Private
router.get('/marketplace', protect, async (req, res) => {
  // TODO: Implement Sequelize marketplace accounts
  // For now, return demo data
  const demoMarketplaceAccounts = [
    {
      marketplace: 'trendyol',
      isActive: false,
      settings: {},
      lastSyncDate: null,
      hasCredentials: false
    },
    {
      marketplace: 'hepsiburada',
      isActive: false,
      settings: {},
      lastSyncDate: null,
      hasCredentials: false
    }
  ];

  res.status(200).json({
    success: true,
    data: demoMarketplaceAccounts
  });
});

// @desc    Update marketplace account
// @route   PUT /api/v1/auth/marketplace/:marketplace
// @access  Private
router.put('/marketplace/:marketplace', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { credentials, settings, isActive } = req.body;

    // TODO: Implement Sequelize marketplace accounts
    // For now, return demo response
    logger.info(`Marketplace account update attempted: ${marketplace} for user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: `${marketplace} account updated successfully (demo mode)`
    });
  } catch (error) {
    logger.error('Marketplace account update failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 