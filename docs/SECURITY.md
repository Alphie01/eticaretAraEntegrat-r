# Güvenlik Özellikleri ve Best Practices

## 📋 İçindekiler

- [Genel Güvenlik Yaklaşımı](#genel-güvenlik-yaklaşımı)
- [Kimlik Doğrulama](#kimlik-doğrulama)
- [API Key Şifreleme](#api-key-şifreleme)
- [Data Isolation](#data-isolation)
- [Rate Limiting](#rate-limiting)
- [Input Validation](#input-validation)
- [Error Handling](#error-handling)
- [Logging ve Monitoring](#logging-ve-monitoring)
- [Production Security](#production-security)

## 🛡️ Genel Güvenlik Yaklaşımı

E-Ticaret Ara Entegratör, çoklu kullanıcılı bir SaaS uygulaması olarak tasarlanmış olup, enterprise seviyesinde güvenlik önlemleri implementes edilmiştir.

### Güvenlik Katmanları

```
┌─────────────────────┐
│   WAF / Reverse     │ ← DDoS Protection, SSL/TLS
│   Proxy (Nginx)    │
└─────────────────────┘
          │
┌─────────────────────┐
│   Rate Limiting     │ ← Request throttling
│   & Input Validation│
└─────────────────────┘
          │
┌─────────────────────┐
│   JWT Authentication│ ← Token-based auth
│   & Authorization  │
└─────────────────────┘
          │
┌─────────────────────┐
│   Data Isolation    │ ← User-based separation
│   & Encryption     │
└─────────────────────┘
          │
┌─────────────────────┐
│   Database &        │ ← Encrypted storage
│   Audit Logging    │
└─────────────────────┘
```

## 🔐 Kimlik Doğrulama

### JWT (JSON Web Token) Implementation

```javascript
// Token Generation
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'eticaret-ara-entegrator',
      audience: 'api-users'
    }
  );
};

// Token Verification Middleware
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Extract token from header
    if (req.headers.authorization && 
        req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};
```

### Password Security

```javascript
// Password Hashing (bcrypt)
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12; // Higher than default for extra security

// Hash password before saving
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
  }
});

// Password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    isValid: password.length >= minLength && 
             hasUpperCase && 
             hasLowerCase && 
             hasNumbers && 
             hasSpecialChar,
    errors: {
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    }
  };
};
```

## 🔒 API Key Şifreleme

### AES-256-CBC Encryption

```javascript
// Encryption utility
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 64 char hex string

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

const decrypt = (encryptedData) => {
  try {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};
```

### Secure API Key Storage

```javascript
// UserMarketplaceKeys Model Security Methods
class UserMarketplaceKeys extends Model {
  
  // Encrypt and store credentials
  async setCredentials(credentials) {
    try {
      if (credentials.api_key) {
        this.encrypted_api_key = encrypt(credentials.api_key);
      }
      
      if (credentials.api_secret) {
        this.encrypted_api_secret = encrypt(credentials.api_secret);
      }
      
      if (credentials.supplier_id) {
        this.encrypted_supplier_id = encrypt(credentials.supplier_id);
      }
      
      await this.save();
      
      // Log the action (without sensitive data)
      logger.info(`API keys updated for user ${this.user_id}, marketplace ${this.marketplace}`);
      
    } catch (error) {
      logger.error('Failed to set credentials:', error);
      throw new Error('Failed to save API credentials');
    }
  }
  
  // Decrypt and return credentials
  getDecryptedCredentials() {
    try {
      const credentials = {};
      
      if (this.encrypted_api_key) {
        credentials.api_key = decrypt(this.encrypted_api_key);
      }
      
      if (this.encrypted_api_secret) {
        credentials.api_secret = decrypt(this.encrypted_api_secret);
      }
      
      if (this.encrypted_supplier_id) {
        credentials.supplier_id = decrypt(this.encrypted_supplier_id);
      }
      
      return credentials;
      
    } catch (error) {
      logger.error('Failed to decrypt credentials:', error);
      throw new Error('Failed to retrieve API credentials');
    }
  }
}
```

## 🔐 Data Isolation

### User-Based Data Separation

```javascript
// Middleware to ensure user can only access their own data
const ensureOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.id;
      
      const resource = await model.findOne({
        where: {
          id: resourceId,
          user_id: userId
        }
      });
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found or access denied'
        });
      }
      
      req.resource = resource;
      next();
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Usage in routes
router.get('/products/:id', protect, ensureOwnership(Product), getProduct);
router.put('/products/:id', protect, ensureOwnership(Product), updateProduct);
router.delete('/products/:id', protect, ensureOwnership(Product), deleteProduct);
```

### Database Query Security

```javascript
// Always include user_id in queries
const getUserProducts = async (userId, filters = {}) => {
  return await Product.findAll({
    where: {
      user_id: userId, // ALWAYS include user_id
      ...filters
    },
    include: [
      {
        model: ProductVariant,
        as: 'variants'
      }
    ]
  });
};

// Sequelize hooks for automatic user_id injection
Product.addHook('beforeFind', (options) => {
  if (options.where && !options.where.user_id) {
    logger.warn('Query without user_id detected');
  }
});
```

## ⚡ Rate Limiting

### Request Throttling

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// General API rate limiting
const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retry_after: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiting for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 auth attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retry_after: '15 minutes'
  }
});

// Sync operation limiting
const syncLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:sync:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 sync operations per hour
  message: {
    success: false,
    error: 'Sync operation limit exceeded. Please wait before trying again.',
    retry_after: '1 hour'
  }
});

// Apply rate limiting
app.use('/api/v1', generalLimiter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/sync', syncLimiter);
```

## ✅ Input Validation

### Request Validation

```javascript
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().reduce((acc, error) => {
        acc[error.param] = error.msg;
        return acc;
      }, {})
    });
  }
  
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2-255 characters')
    .matches(/^[a-zA-ZığüşöçİĞÜŞÖÇ\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
    
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase, lowercase, number and special character'),
    
  validateRequest
];

// API key validation
const validateAPIKeys = [
  body('marketplace')
    .isIn(['trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'])
    .withMessage('Invalid marketplace'),
    
  body('credentials.api_key')
    .isLength({ min: 10 })
    .withMessage('API key is required and must be at least 10 characters'),
    
  body('credentials.api_secret')
    .isLength({ min: 10 })
    .withMessage('API secret is required and must be at least 10 characters'),
    
  validateRequest
];
```

### SQL Injection Prevention

```javascript
// Using Sequelize ORM prevents SQL injection by default
// But always validate inputs and use parameterized queries

// GOOD - Sequelize handles parameterization
const products = await Product.findAll({
  where: {
    user_id: userId,
    name: {
      [Op.like]: `%${searchTerm}%`
    }
  }
});

// BAD - Never use raw queries with user input
// const products = await sequelize.query(
//   `SELECT * FROM products WHERE name LIKE '%${searchTerm}%'`
// );

// If raw queries are necessary, use replacements
const products = await sequelize.query(
  'SELECT * FROM products WHERE user_id = :userId AND name LIKE :searchTerm',
  {
    replacements: {
      userId: userId,
      searchTerm: `%${searchTerm}%`
    },
    type: QueryTypes.SELECT
  }
);
```

## 🛠️ Error Handling

### Secure Error Messages

```javascript
// Global error handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  // Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
};

// Custom error class
class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
```

## 📊 Logging ve Monitoring

### Security Event Logging

```javascript
const winston = require('winston');

// Security-specific logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn'
    }),
    new winston.transports.File({ 
      filename: 'logs/security-error.log',
      level: 'error'
    })
  ]
});

// Security event logging
const logSecurityEvent = (event, details = {}) => {
  securityLogger.info({
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Usage examples
logSecurityEvent('LOGIN_SUCCESS', { userId, ip: req.ip });
logSecurityEvent('LOGIN_FAILED', { email, ip: req.ip, reason: 'invalid_password' });
logSecurityEvent('API_KEY_CREATED', { userId, marketplace });
logSecurityEvent('UNAUTHORIZED_ACCESS', { userId, resource, ip: req.ip });
logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: req.ip, endpoint: req.path });
```

### Audit Trail

```javascript
// Audit middleware
const auditMiddleware = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after successful response
      if (res.statusCode < 400) {
        logSecurityEvent('AUDIT_TRAIL', {
          action,
          userId: req.user?.id,
          resource: req.params.id,
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          responseCode: res.statusCode
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Usage in routes
router.post('/products', protect, auditMiddleware('CREATE_PRODUCT'), createProduct);
router.put('/products/:id', protect, auditMiddleware('UPDATE_PRODUCT'), updateProduct);
router.delete('/products/:id', protect, auditMiddleware('DELETE_PRODUCT'), deleteProduct);
```

## 🚀 Production Security

### HTTPS Configuration

```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### Security Headers

```javascript
const helmet = require('helmet');

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const cors = require('cors');
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Environment Variables Security

```bash
# .env file security
# Never commit .env files to version control

# Use strong, unique values
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-and-random
ENCRYPTION_KEY=64-character-hex-string-for-aes-256-encryption

# Restrict database access
DB_HOST=your-secure-database-host
DB_USER=limited-privilege-user
DB_PASSWORD=strong-database-password

# Use secure Redis connection
REDIS_HOST=your-secure-redis-host
REDIS_PASSWORD=strong-redis-password
REDIS_TLS=true
```

### Security Checklist

- [ ] SSL/TLS certificates properly configured
- [ ] Environment variables secured
- [ ] Database credentials rotated regularly
- [ ] API rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive information
- [ ] Audit logging enabled
- [ ] Regular security updates applied
- [ ] Backup encryption enabled
- [ ] Access logs monitored
- [ ] Penetration testing completed
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] API keys encrypted at rest
- [ ] User sessions secured

---

## 📞 Security Issues

Güvenlik açığı tespit ederseniz:
- 🔒 **Security Email**: security@yourcompany.com
- 📱 **Bug Bounty**: Responsible disclosure policy
- 🚨 **Emergency**: Critical security issues için immediate contact

**Not**: Güvenlik açıklarını public olarak paylaşmayın. Önce güvenlik ekibi ile iletişime geçin. 