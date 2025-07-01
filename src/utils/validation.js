const Joi = require('joi');

// User validation schemas
const userSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    company: Joi.object({
      name: Joi.string().max(200),
      taxNumber: Joi.string().max(50),
      address: Joi.string().max(500),
      phone: Joi.string().max(20)
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    company: Joi.object({
      name: Joi.string().max(200),
      taxNumber: Joi.string().max(50),
      address: Joi.string().max(500),
      phone: Joi.string().max(20)
    }),
    preferences: Joi.object({
      language: Joi.string().valid('tr', 'en'),
      timezone: Joi.string(),
      notifications: Joi.object({
        email: Joi.boolean(),
        orderUpdates: Joi.boolean(),
        stockAlerts: Joi.boolean(),
        syncErrors: Joi.boolean()
      })
    })
  }),

  updatePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required()
  }),

  addMarketplace: Joi.object({
    marketplace: Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11').required(),
    credentials: Joi.object().required(),
    settings: Joi.object({
      syncProducts: Joi.boolean(),
      syncOrders: Joi.boolean(),
      syncStock: Joi.boolean(),
      syncPrices: Joi.boolean()
    })
  })
};

// Product validation schemas
const productSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(2000).required(),
    shortDescription: Joi.string().max(500),
    category: Joi.object({
      name: Joi.string().required(),
      path: Joi.string()
    }).required(),
    brand: Joi.string().required(),
    basePrice: Joi.number().min(0).required(),
    currency: Joi.string().valid('TRY', 'USD', 'EUR', 'GBP').default('TRY'),
    tax: Joi.object({
      rate: Joi.number().min(0).max(100).default(18),
      included: Joi.boolean().default(true)
    }),
    variants: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        sku: Joi.string().required(),
        barcode: Joi.string(),
        price: Joi.number().min(0).required(),
        discountedPrice: Joi.number().min(0),
        stock: Joi.number().min(0).required(),
        weight: Joi.number().min(0),
        dimensions: Joi.object({
          length: Joi.number().min(0),
          width: Joi.number().min(0),
          height: Joi.number().min(0)
        }),
        images: Joi.array().items(Joi.string().uri()),
        attributes: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            value: Joi.string().required()
          })
        )
      })
    ),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        alt: Joi.string(),
        order: Joi.number().default(0),
        isMain: Joi.boolean().default(false)
      })
    ),
    tags: Joi.array().items(Joi.string()),
    specifications: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
        group: Joi.string()
      })
    ),
    marketplaceSettings: Joi.array().items(
      Joi.object({
        marketplace: Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11').required(),
        isActive: Joi.boolean().default(true),
        autoSync: Joi.boolean().default(true),
        priceMultiplier: Joi.number().min(0.1).max(10).default(1),
        stockBuffer: Joi.number().min(0).default(0),
        customTitle: Joi.string(),
        customDescription: Joi.string(),
        customImages: Joi.array().items(Joi.string().uri())
      })
    ),
    status: Joi.string().valid('draft', 'active', 'inactive', 'archived').default('draft')
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(200),
    description: Joi.string().max(2000),
    shortDescription: Joi.string().max(500),
    category: Joi.object({
      name: Joi.string().required(),
      path: Joi.string()
    }),
    brand: Joi.string(),
    basePrice: Joi.number().min(0),
    currency: Joi.string().valid('TRY', 'USD', 'EUR', 'GBP'),
    tax: Joi.object({
      rate: Joi.number().min(0).max(100),
      included: Joi.boolean()
    }),
    variants: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        sku: Joi.string().required(),
        barcode: Joi.string(),
        price: Joi.number().min(0).required(),
        discountedPrice: Joi.number().min(0),
        stock: Joi.number().min(0).required(),
        weight: Joi.number().min(0),
        dimensions: Joi.object({
          length: Joi.number().min(0),
          width: Joi.number().min(0),
          height: Joi.number().min(0)
        }),
        images: Joi.array().items(Joi.string().uri()),
        attributes: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            value: Joi.string().required()
          })
        )
      })
    ),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        alt: Joi.string(),
        order: Joi.number().default(0),
        isMain: Joi.boolean().default(false)
      })
    ),
    tags: Joi.array().items(Joi.string()),
    specifications: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
        group: Joi.string()
      })
    ),
    marketplaceSettings: Joi.array().items(
      Joi.object({
        marketplace: Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11').required(),
        isActive: Joi.boolean(),
        autoSync: Joi.boolean(),
        priceMultiplier: Joi.number().min(0.1).max(10),
        stockBuffer: Joi.number().min(0),
        customTitle: Joi.string(),
        customDescription: Joi.string(),
        customImages: Joi.array().items(Joi.string().uri())
      })
    ),
    status: Joi.string().valid('draft', 'active', 'inactive', 'archived')
  }),

  updateStock: Joi.object({
    variants: Joi.array().items(
      Joi.object({
        variantId: Joi.string().required(),
        stock: Joi.number().min(0).required()
      })
    ).required(),
    syncToMarketplaces: Joi.boolean().default(true)
  }),

  updatePrice: Joi.object({
    basePrice: Joi.number().min(0),
    variants: Joi.array().items(
      Joi.object({
        variantId: Joi.string().required(),
        price: Joi.number().min(0),
        discountedPrice: Joi.number().min(0)
      })
    ),
    syncToMarketplaces: Joi.boolean().default(true)
  }),

  sync: Joi.object({
    marketplaces: Joi.array().items(
      Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11')
    )
  }),

  bulkOperation: Joi.object({
    operation: Joi.string().valid('updateStatus', 'updateCategory', 'syncToMarketplace').required(),
    productIds: Joi.array().items(Joi.string()).min(1).required(),
    data: Joi.object().required()
  })
};

// Order validation schemas
const orderSchemas = {
  create: Joi.object({
    marketplace: Joi.object({
      name: Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11', 'website').required(),
      orderId: Joi.string().required(),
      orderNumber: Joi.string(),
      orderDate: Joi.date()
    }).required(),
    customer: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email(),
      phone: Joi.string(),
      taxNumber: Joi.string(),
      isCompany: Joi.boolean().default(false)
    }).required(),
    items: Joi.array().items(
      Joi.object({
        product: Joi.string().required(),
        variant: Joi.string().required(),
        name: Joi.string().required(),
        sku: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        unitPrice: Joi.number().min(0).required(),
        totalPrice: Joi.number().min(0).required()
      })
    ).min(1).required(),
    pricing: Joi.object({
      subtotal: Joi.number().min(0).required(),
      shipping: Joi.number().min(0).default(0),
      tax: Joi.number().min(0).default(0),
      discount: Joi.number().min(0).default(0),
      total: Joi.number().min(0).required()
    }).required()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid(
      'pending', 'confirmed', 'processing', 'shipped', 
      'delivered', 'cancelled', 'refunded', 'returned'
    ).required(),
    note: Joi.string().max(500),
    trackingInfo: Joi.object({
      trackingNumber: Joi.string(),
      carrierCode: Joi.string(),
      estimatedDelivery: Joi.date()
    }),
    syncToMarketplace: Joi.boolean().default(true)
  }),

  addNote: Joi.object({
    note: Joi.string().max(1000).required(),
    isPrivate: Joi.boolean().default(false)
  }),

  cancel: Joi.object({
    reason: Joi.string().max(500).required(),
    refundAmount: Joi.number().min(0)
  }),

  refund: Joi.object({
    amount: Joi.number().min(0).required(),
    reason: Joi.string().max(500).required()
  }),

  import: Joi.object({
    marketplaces: Joi.array().items(
      Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11')
    ),
    startDate: Joi.date(),
    endDate: Joi.date()
  })
};

// Sync validation schemas
const syncSchemas = {
  products: Joi.object({
    productIds: Joi.array().items(Joi.string()),
    marketplaces: Joi.array().items(
      Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11')
    )
  }),

  orders: Joi.object({
    marketplaces: Joi.array().items(
      Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11')
    ),
    startDate: Joi.date(),
    endDate: Joi.date()
  })
};

// Report validation schemas
const reportSchemas = {
  salesReport: Joi.object({
    startDate: Joi.date(),
    endDate: Joi.date(),
    marketplace: Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11'),
    groupBy: Joi.string().valid('hour', 'day', 'month', 'year').default('day')
  }),

  productsReport: Joi.object({
    startDate: Joi.date(),
    endDate: Joi.date(),
    limit: Joi.number().min(1).max(100).default(20),
    sortBy: Joi.string().valid('revenue', 'quantity').default('revenue')
  }),

  export: Joi.object({
    type: Joi.string().valid('sales', 'products', 'orders', 'inventory').required(),
    format: Joi.string().valid('json', 'csv').default('json'),
    startDate: Joi.date(),
    endDate: Joi.date()
  })
};

// Marketplace validation schemas
const marketplaceSchemas = {
  bulkOperation: Joi.object({
    operation: Joi.string().required(),
    marketplaces: Joi.array().items(
      Joi.string().valid('trendyol', 'hepsiburada', 'amazon', 'n11')
    ).required(),
    data: Joi.object()
  }),

  updateStock: Joi.object({
    stock: Joi.number().min(0).required(),
    variantId: Joi.string()
  }),

  updatePrice: Joi.object({
    price: Joi.number().min(0).required(),
    variantId: Joi.string()
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().required(),
    trackingInfo: Joi.object({
      trackingNumber: Joi.string(),
      carrierCode: Joi.string()
    })
  })
};

// Middleware function to validate request body
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

// Middleware function to validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: errors
      });
    }

    req.query = value;
    next();
  };
};

module.exports = {
  userSchemas,
  productSchemas,
  orderSchemas,
  syncSchemas,
  reportSchemas,
  marketplaceSchemas,
  validateBody,
  validateQuery
}; 