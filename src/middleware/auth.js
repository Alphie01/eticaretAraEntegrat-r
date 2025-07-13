const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { User, UserRole } = require("../models");
const { UserCompany } = require("../models/UserCompany");

/* 

AUTH/ME DÖNÜŞÜNE BURADAN EKLE

*/

// Protect middleware - authenticate user
const protect = async (req, res, next) => {
  let token;

  // Get token from header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token with role information
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: UserRole,
          as: "role",
        },
        { model: UserCompany, as: "company", required: false },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "No user found with this id",
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: "User account is deactivated",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        error: "Account is temporarily locked. Please try again later.",
      });
    }

    // Update last login
    await user.update({
      last_login: new Date(),
    });

    req.user = user;
    next();
  } catch (error) {
    logger.error("Token verification failed:", error);

    let message = "Not authorized to access this route";

    if (error.name === "TokenExpiredError") {
      message = "Token expired";
    } else if (error.name === "JsonWebTokenError") {
      message = "Invalid token";
    }

    return res.status(401).json({
      success: false,
      error: message,
    });
  }
};

// Authorize roles
const protectedCompany = async (req, res, next) => {
  let token;

  // Get token from header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kullanıcıyı role ve company ile birlikte çek
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: UserRole,
          as: "role",
        },
        {
          model: UserCompany,
          as: "company",
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "No user in Company found with this id",
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: "User account is deactivated",
      });
    }

    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        error: "Account is temporarily locked. Please try again later.",
      });
    }

    // Kullanıcının bağlı olduğu şirketin company_id'si
    const companyId = user.company?.company_id;

    if (!companyId) {
      return res.status(404).json({
        success: false,
        error: "User has no company assigned",
      });
    }

    // Şirkete bağlı tüm kullanıcıları (çalışanları) çek
    const employees = await User.findAll({
      where: { companyID: companyId },
      attributes: ["id", "name", "email", "role_id", "is_active"],
      include: [
        {
          model: UserRole,
          as: "role",
        },
      ],
    });

    // middleware'den aşağı aktarılacak bilgiler
    req.company = {
      info: user.company,
      employees: employees,
      currentUser: user,
    };

    next();
  } catch (error) {
    logger.error("Token verification failed:", error);

    let message = "Not authorized to access this route";

    if (error.name === "TokenExpiredError") {
      message = "Token expired";
    } else if (error.name === "JsonWebTokenError") {
      message = "Invalid token";
    }

    return res.status(401).json({
      success: false,
      error: message,
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const userRole = req.user.role?.role_name;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `User role ${userRole} is not authorized to access this route`,
      });
    }

    next();
  };
};

// Authorize permissions (new dynamic permission system)
const authorizePermission = (permissionKey) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    try {
      const hasPermission = await req.user.hasPermission(permissionKey);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Permission required: ${permissionKey}`,
        });
      }

      next();
    } catch (error) {
      logger.error("Permission check failed:", error);
      return res.status(500).json({
        success: false,
        error: "Server error during permission check",
      });
    }
  };
};

// Advanced authentication - optional user authentication
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findByPk(decoded.id, {
        include: [
          {
            model: UserRole,
            as: "role",
          },
        ],
      });

      if (user && user.is_active && !user.isLocked) {
        req.user = user;
      }
    } catch (error) {
      // Silent fail - user remains unauthenticated
      logger.warn("Optional auth failed:", error.message);
    }
  }

  next();
};

// Rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id.toString();
    const now = Date.now();

    // Clean old entries
    if (userRequests.has(userId)) {
      const userRequestData = userRequests.get(userId);
      userRequestData.requests = userRequestData.requests.filter(
        (timestamp) => now - timestamp < windowMs
      );
    }

    // Get or create user request data
    const userRequestData = userRequests.get(userId) || { requests: [] };

    // Check if limit exceeded
    if (userRequestData.requests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: "Too many requests from this user",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Add current request
    userRequestData.requests.push(now);
    userRequests.set(userId, userRequestData);

    // Add rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests,
      "X-RateLimit-Remaining": maxRequests - userRequestData.requests.length,
      "X-RateLimit-Reset": new Date(now + windowMs),
    });

    next();
  };
};

// Marketplace access check
const checkMarketplaceAccess = (marketplace) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      const marketplaceAccount =
        await req.user.getMarketplaceAccount(marketplace);

      if (!marketplaceAccount) {
        return res.status(403).json({
          success: false,
          error: `No access to marketplace: ${marketplace}`,
        });
      }

      if (!marketplaceAccount.is_active) {
        return res.status(403).json({
          success: false,
          error: `Marketplace account is deactivated: ${marketplace}`,
        });
      }

      req.marketplaceAccount = marketplaceAccount;
      next();
    } catch (error) {
      logger.error("Marketplace access check failed:", error);
      return res.status(500).json({
        success: false,
        error: "Server error during marketplace access check",
      });
    }
  };
};

// API key authentication (for webhooks and external integrations)
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "API key required",
    });
  }

  try {
    // Find user by API key (this would need to be implemented in a separate API keys table)
    // For now, we'll disable this functionality until API keys table is created
    return res.status(501).json({
      success: false,
      error: "API key authentication not implemented yet",
    });

    // TODO: Implement API key authentication with proper API keys table
    /*
    const user = await User.findOne({ 
      // This would need to be implemented with a proper API keys table
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    */

    req.user = user;
    req.isApiKeyAuth = true;
    next();
  } catch (error) {
    logger.error("API key authentication failed:", error);
    return res.status(500).json({
      success: false,
      error: "Server error during authentication",
    });
  }
};

module.exports = {
  protect,
  protectedCompany,
  authorize,
  authorizePermission,
  optionalAuth,
  userRateLimit,
  checkMarketplaceAccess,
  apiKeyAuth,
};
