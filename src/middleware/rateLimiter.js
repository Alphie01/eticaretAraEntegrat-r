const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

let rateLimiter;
let isRedisAvailable = false;

// Rate limiter ayarları
const rateLimiterOptions = {
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900, // 15 minutes
  blockDuration: 900, // Block for 15 minutes
};

// Initialize rate limiter
const initializeRateLimiter = () => {
  try {
    const redisClient = getRedisClient();
    
    // Check if Redis client is actually connected
    if (redisClient && redisClient.isReady) {
      rateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyGenerator: (req) => req.ip,
        ...rateLimiterOptions
      });
      isRedisAvailable = true;
      logger.info('Rate limiter initialized with Redis');
    } else {
      throw new Error('Redis client not ready');
    }
  } catch (error) {
    logger.warn('Redis not available for rate limiting, using memory store');
    rateLimiter = new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      ...rateLimiterOptions
    });
    isRedisAvailable = false;
  }
};

// Rate limiter middleware factory
const createRateLimiter = (maxRequests, windowSeconds) => {
  return async (req, res, next) => {
    try {
      // Create custom rate limiter for this specific limit
      let customRateLimiter;
      
      try {
        const redisClient = getRedisClient();
        
        if (redisClient && redisClient.isReady) {
          customRateLimiter = new RateLimiterRedis({
            storeClient: redisClient,
            keyGenerator: (req) => `${req.ip}:${req.route?.path || req.path}`,
            points: maxRequests,
            duration: windowSeconds,
            blockDuration: windowSeconds
          });
        } else {
          throw new Error('Redis client not ready');
        }
      } catch (error) {
        customRateLimiter = new RateLimiterMemory({
          keyGenerator: (req) => `${req.ip}:${req.route?.path || req.path}`,
          points: maxRequests,
          duration: windowSeconds,
          blockDuration: windowSeconds
        });
      }

      await customRateLimiter.consume(req.ip);
      next();
    } catch (rejRes) {
      const remainingPoints = rejRes.remainingPoints || 0;
      const msBeforeNext = rejRes.msBeforeNext || 0;
      
      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000) || 1,
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
      });

      logger.warn(`Rate limit exceeded for IP: ${req.ip}, route: ${req.path}`);
      
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: Math.round(msBeforeNext / 1000)
      });
    }
  };
};

// Default rate limiter middleware
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // Initialize rate limiter if not already done
    if (!rateLimiter) {
      initializeRateLimiter();
    }

    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    // If Redis connection failed during operation, fallback to memory
    if (isRedisAvailable && rejRes.name === 'ClientClosedError') {
      logger.warn('Redis connection lost, switching to memory store');
      rateLimiter = new RateLimiterMemory({
        keyGenerator: (req) => req.ip,
        ...rateLimiterOptions
      });
      isRedisAvailable = false;
      
      try {
        await rateLimiter.consume(req.ip);
        return next();
      } catch (memoryRejRes) {
        rejRes = memoryRejRes;
      }
    }
    
    // Rate limit exceeded
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': rateLimiterOptions.points,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
    });

    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

module.exports = createRateLimiter;
module.exports.default = rateLimiterMiddleware; 