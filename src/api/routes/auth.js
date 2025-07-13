const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const passport = require("../../config/passport"); // Import passport config
const { protect,protectedCompany,  authorize } = require("../../middleware/auth");
const logger = require("../../utils/logger");
const { SUPPORTED_MARKETPLACES } = require("../../constants/marketplaces");
const { UserCompany } = require("../../models/UserCompany");

// Import models properly
const { User } = require("../../models");
const { Op } = require("sequelize");

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    // Create JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.status(statusCode).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id || 1,
        is_active: user.is_active || true,
      },
      message: "Authentication successful",
    });
  } catch (error) {
    logger.error("SendTokenResponse failed:", error);
    res.status(500).json({
      success: false,
      error: "Error generating authentication token: " + error.message,
    });
  }
};

const router = express.Router();

// Debug test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth route is working",
    timestamp: new Date().toISOString(),
  });
});

// @desc    Debug - Check demo user
// @route   GET /api/v1/auth/debug
// @access  Public
router.get("/debug", async (req, res) => {
  try {
    // Check if demo user exists (now with OAuth fields)
    const demoUser = await User.findOne({
      where: { email: "demo@eticaret.com" },
      attributes: [
        "id",
        "name",
        "email",
        "oauth_provider",
        "password_hash",
        "google_id",
        "facebook_id",
        "apple_id",
        "email_verified",
      ],
    });

    // Count all users
    const userCount = await User.count();

    res.json({
      success: true,
      data: {
        demoUserExists: !!demoUser,
        demoUser: demoUser
          ? {
              id: demoUser.id,
              name: demoUser.name,
              email: demoUser.email,
              oauth_provider: demoUser.oauth_provider,
              hasPassword: !!demoUser.password_hash,
              google_id: demoUser.google_id,
              facebook_id: demoUser.facebook_id,
              apple_id: demoUser.apple_id,
              email_verified: demoUser.email_verified,
            }
          : null,
        totalUsers: userCount,
      },
    });
  } catch (error) {
    logger.error("Debug endpoint failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Run OAuth Migration
// @route   POST /api/v1/auth/migrate-oauth
// @access  Public
router.post("/migrate-oauth", async (req, res) => {
  try {
    const { getSequelize } = require("../../config/database");
    const sequelize = getSequelize();

    // Check if OAuth columns already exist
    const checkColumnsSQL = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('google_id', 'facebook_id', 'apple_id', 'avatar_url', 'email_verified', 'oauth_provider', 'oauth_access_token', 'oauth_refresh_token')
    `;

    const existingColumns = await sequelize.query(checkColumnsSQL, {
      type: sequelize.QueryTypes.SELECT,
    });

    const existingColumnNames = existingColumns.map((col) => col.COLUMN_NAME);

    // Add columns one by one if they don't exist
    const columnsToAdd = [
      {
        name: "google_id",
        sql: "ALTER TABLE users ADD google_id NVARCHAR(255) NULL",
      },
      {
        name: "facebook_id",
        sql: "ALTER TABLE users ADD facebook_id NVARCHAR(255) NULL",
      },
      {
        name: "apple_id",
        sql: "ALTER TABLE users ADD apple_id NVARCHAR(255) NULL",
      },
      {
        name: "avatar_url",
        sql: "ALTER TABLE users ADD avatar_url NTEXT NULL",
      },
      {
        name: "email_verified",
        sql: "ALTER TABLE users ADD email_verified BIT NOT NULL DEFAULT 0",
      },
      {
        name: "oauth_provider",
        sql: "ALTER TABLE users ADD oauth_provider NVARCHAR(20) NOT NULL DEFAULT 'local'",
      },
      {
        name: "oauth_access_token",
        sql: "ALTER TABLE users ADD oauth_access_token NTEXT NULL",
      },
      {
        name: "oauth_refresh_token",
        sql: "ALTER TABLE users ADD oauth_refresh_token NTEXT NULL",
      },
    ];

    const results = [];

    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          await sequelize.query(column.sql, { type: sequelize.QueryTypes.RAW });
          results.push(`Added column: ${column.name}`);
          logger.info(`Added OAuth column: ${column.name}`);
        } catch (error) {
          results.push(`Failed to add column ${column.name}: ${error.message}`);
          logger.error(`Failed to add OAuth column ${column.name}:`, error);
        }
      } else {
        results.push(`Column already exists: ${column.name}`);
      }
    }

    // Update existing users to have 'local' oauth_provider
    try {
      await sequelize.query(
        "UPDATE users SET oauth_provider = 'local' WHERE oauth_provider IS NULL OR oauth_provider = ''",
        { type: sequelize.QueryTypes.UPDATE }
      );
      results.push("Updated existing users oauth_provider to local");
    } catch (error) {
      results.push(`Failed to update oauth_provider: ${error.message}`);
    }

    logger.info("OAuth migration completed via API");
    res.json({
      success: true,
      message: "OAuth migration completed",
      results: results,
    });
  } catch (error) {
    logger.error("OAuth migration via API failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, company } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists with this email",
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password_hash: password, // Sequelize field name
      role_id: 1, // Default role
    });

    logger.info(`New user registered: ${email}`);
    sendTokenResponse(user, 201, res);
  } catch (error) {
    logger.error("User registration failed:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email and password",
      });
    }

    // Check for user
    const user = await User.findOne({
      where: { email },
      attributes: { include: ["password_hash"] },
      include: [
        {
          model: UserCompany,
          as: "company", // alias ile birebir aynı
          required: false, // LEFT JOIN
        },
      ],
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        error:
          "Account temporarily locked due to too many failed login attempts",
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();

      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Reset login attempts on successful login
    if (user.login_attempts > 0) {
      await user.update({
        login_attempts: 0,
        lock_until: null,
      });
    }

    logger.info(`User logged in: ${email}`);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error("User login failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
router.get("/me", protect, async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

// @desc    Company details for current user
// @route   PUT /api/v1/auth/company/me
// @access  Private
router.get("/company/me", protectedCompany, async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.company,
  });
});


// @desc    Update user details
// @route   PUT /api/v1/auth/me
// @access  Private
router.put("/me", protect, async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      company: req.body.company,
      preferences: req.body.preferences,
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    await user.update(fieldsToUpdate);

    logger.info(`User profile updated: ${user.email}`);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Profile update failed:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
router.put("/updatepassword", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Please provide current and new password",
      });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: { include: ["password_hash"] },
    });

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    user.password_hash = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error("Password update failed:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
router.post("/forgotpassword", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No user found with this email",
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
      message: "Password reset token sent",
      resetToken, // Remove this in production
    });
  } catch (error) {
    logger.error("Forgot password failed:", error);
    res.status(500).json({
      success: false,
      error: "Email could not be sent",
    });
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
router.put("/resetpassword/:resettoken", async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    let user;
    if (Op) {
      user = await User.findOne({
        where: {
          reset_password_token: resetPasswordToken,
          reset_password_expire: { [Op.gt]: new Date() },
        },
      });
    } else {
      // Demo mode fallback
      user = null;
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
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
    logger.error("Password reset failed:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
router.get("/logout", protect, async (req, res) => {
  logger.info(`User logged out: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
});

// @desc    Add marketplace account
// @route   POST /api/v1/auth/marketplace
// @access  Private
router.post("/marketplace", protect, async (req, res) => {
  try {
    const { marketplace, credentials, settings } = req.body;

    // Validate marketplace
    if (!SUPPORTED_MARKETPLACES.includes(marketplace)) {
      return res.status(400).json({
        success: false,
        error: "Invalid marketplace",
      });
    }

    // TODO: Implement Sequelize marketplace accounts
    // For now, return demo response
    logger.info(
      `Marketplace account configuration attempted: ${marketplace} for user ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      message: `${marketplace} account configuration saved (demo mode)`,
    });
  } catch (error) {
    logger.error("Marketplace account configuration failed:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Get marketplace accounts
// @route   GET /api/v1/auth/marketplace
// @access  Private
router.get("/marketplace", protect, async (req, res) => {
  // TODO: Implement Sequelize marketplace accounts
  // For now, return demo data
  const demoMarketplaceAccounts = [
    {
      marketplace: "trendyol",
      isActive: false,
      settings: {},
      lastSyncDate: null,
      hasCredentials: false,
    },
    {
      marketplace: "hepsiburada",
      isActive: false,
      settings: {},
      lastSyncDate: null,
      hasCredentials: false,
    },
  ];

  res.status(200).json({
    success: true,
    data: demoMarketplaceAccounts,
  });
});

// @desc    Update marketplace account
// @route   PUT /api/v1/auth/marketplace/:marketplace
// @access  Private
router.put("/marketplace/:marketplace", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { credentials, settings, isActive } = req.body;

    // TODO: Implement Sequelize marketplace accounts
    // For now, return demo response
    logger.info(
      `Marketplace account update attempted: ${marketplace} for user ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      message: `${marketplace} account updated successfully (demo mode)`,
    });
  } catch (error) {
    logger.error("Marketplace account update failed:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// =======================
// OAuth Routes
// =======================

// @desc    Google OAuth
// @route   GET /api/v1/auth/google
// @access  Public
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// @desc    Google OAuth callback
// @route   GET /api/v1/auth/google/callback
// @access  Public
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });

      // Redirect to frontend with token
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3003";
      res.redirect(
        `${frontendURL}/auth/callback?token=${token}&provider=google`
      );
    } catch (error) {
      logger.error("Google OAuth callback error:", error);
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3003";
      res.redirect(`${frontendURL}/auth/callback?error=oauth_failed`);
    }
  }
);

// @desc    Facebook OAuth
// @route   GET /api/v1/auth/facebook
// @access  Public
router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email", "public_profile"],
  })
);

// @desc    Facebook OAuth callback
// @route   GET /api/v1/auth/facebook/callback
// @access  Public
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });

      // Redirect to frontend with token
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3003";
      res.redirect(
        `${frontendURL}/auth/callback?token=${token}&provider=facebook`
      );
    } catch (error) {
      logger.error("Facebook OAuth callback error:", error);
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3003";
      res.redirect(`${frontendURL}/auth/callback?error=oauth_failed`);
    }
  }
);

// @desc    Apple OAuth (placeholder for future implementation)
// @route   GET /api/v1/auth/apple
// @access  Public
router.get("/apple", (req, res) => {
  res.status(501).json({
    success: false,
    message: "Apple Sign-In not yet implemented",
  });
});

// @desc    Link OAuth account to existing user
// @route   POST /api/v1/auth/link-oauth
// @access  Private
router.post("/link-oauth", protect, async (req, res) => {
  try {
    const { provider, oauth_id, avatar_url } = req.body;

    if (!["google", "facebook", "apple"].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: "Invalid OAuth provider",
      });
    }

    const updateData = {};
    updateData[`${provider}_id`] = oauth_id;
    updateData.avatar_url = avatar_url;

    await req.user.update(updateData);

    logger.info(`${provider} account linked to user: ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: `${provider} account linked successfully`,
      user: req.user,
    });
  } catch (error) {
    logger.error("Link OAuth account failed:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Unlink OAuth account
// @route   DELETE /api/v1/auth/unlink-oauth/:provider
// @access  Private
router.delete("/unlink-oauth/:provider", protect, async (req, res) => {
  try {
    const { provider } = req.params;

    if (!["google", "facebook", "apple"].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: "Invalid OAuth provider",
      });
    }

    // Check if user has password (can't unlink if OAuth is only auth method)
    if (!req.user.password_hash && req.user.oauth_provider === provider) {
      return res.status(400).json({
        success: false,
        error:
          "Cannot unlink the only authentication method. Please set a password first.",
      });
    }

    const updateData = {};
    updateData[`${provider}_id`] = null;

    // If this was the primary OAuth provider, reset to local
    if (req.user.oauth_provider === provider) {
      updateData.oauth_provider = "local";
    }

    await req.user.update(updateData);

    logger.info(`${provider} account unlinked from user: ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: `${provider} account unlinked successfully`,
    });
  } catch (error) {
    logger.error("Unlink OAuth account failed:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
