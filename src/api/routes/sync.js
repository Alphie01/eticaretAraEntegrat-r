const express = require('express');
const { protect } = require('../../middleware/auth');
const adapterManager = require('../../core/AdapterManager');
const { SyncLog } = require('../../models/SyncLog');
const { Product } = require('../../models/Product');
const { ProductVariant } = require('../../models/ProductVariant');
const { ProductVariantAttribute } = require('../../models/ProductVariantAttribute');
const { ProductCategory } = require('../../models/ProductCategory');
const { ProductImage } = require('../../models/ProductImage');
const { ProductMarketplace } = require('../../models/ProductMarketplace');
const { Order } = require('../../models/Order');
const { getUserTrendyolCredentials } = require('../../utils/userCredentialsHelper');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Helper function to parse Trendyol variant attributes
function parseTrendyolVariantAttributes(variant, trendyolProduct) {
  const attributes = [];
  
  try {
    // Parse attributeCombination if available
    if (variant.attributeCombination) {
      // attributeCombination format example: "Renk: Mavi, Beden: L, Yaş Grubu: 3-6 Yaş"
      const attributePairs = variant.attributeCombination.split(',');
      
      for (const pair of attributePairs) {
        const [name, value] = pair.split(':').map(s => s.trim());
        if (name && value) {
          attributes.push({
            attribute_name: name,
            attribute_value: value,
            attribute_group: 'variant'
          });
        }
      }
    }
    
    // Parse other variant attributes if available
    if (variant.attributes && Array.isArray(variant.attributes)) {
      for (const attr of variant.attributes) {
        if (attr.attributeName && attr.attributeValue) {
          attributes.push({
            attribute_name: attr.attributeName,
            attribute_value: attr.attributeValue,
            attribute_group: 'variant'
          });
        }
      }
    }
    
    // Add common attributes from product level if not already present
    if (trendyolProduct.brand && !attributes.find(a => a.attribute_name.toLowerCase() === 'marka')) {
      attributes.push({
        attribute_name: 'Marka',
        attribute_value: trendyolProduct.brand,
        attribute_group: 'product'
      });
    }
    
    // Add model/SKU if available
    if (variant.barcode && !attributes.find(a => a.attribute_name.toLowerCase() === 'barkod')) {
      attributes.push({
        attribute_name: 'Barkod',
        attribute_value: variant.barcode,
        attribute_group: 'product'
      });
    }
    
  } catch (error) {
    logger.warn(`Failed to parse variant attributes: ${error.message}`);
  }
  
  return attributes;
}

// Helper function to generate variant name from attributes
function generateVariantName(productName, attributes) {
  const variantAttributeNames = ['Renk', 'Beden', 'Yaş Grubu', 'Boy', 'Size', 'Color'];
  const variantParts = [];
  
  for (const attrName of variantAttributeNames) {
    const attr = attributes.find(a => 
      a.attribute_name.toLowerCase() === attrName.toLowerCase() ||
      a.attribute_name.toLowerCase().includes(attrName.toLowerCase())
    );
    if (attr) {
      variantParts.push(attr.attribute_value);
    }
  }
  
  if (variantParts.length > 0) {
    return `${productName} - ${variantParts.join(' / ')}`;
  }
  
  return `${productName} - Varyant`;
}

// Helper function to import orders from Trendyol
async function importTrendyolOrders(trendyolAdapter, userId) {
  try {
    // Get orders from last 30 days - TÜM STATÜLERDE
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    logger.info(`Importing orders from all statuses for the last 30 days`);

    const ordersData = await trendyolAdapter.getOrders({
      startDate: Math.floor(startDate.getTime() / 1000),
      endDate: Math.floor(endDate.getTime() / 1000),
      page: 0,
      size: 200,
      allStatuses: true // TÜM STATÜLERDE SİPARİŞLERİ ÇEK
    });

    let importedCount = 0;
    let updatedCount = 0;
    const errors = [];

    if (ordersData.orders && ordersData.orders.length > 0) {
      logger.info(`Found ${ordersData.orders.length} total orders across all statuses`);

      for (const trendyolOrder of ordersData.orders) {
        try {
          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              user_id: userId,
              marketplace_order_id: trendyolOrder.orderNumber
            }
          });

          // Map Trendyol order to our database schema
          const orderData = {
            user_id: userId,
            marketplace: 'trendyol',
            marketplace_order_id: trendyolOrder.orderNumber,
            order_date: new Date(trendyolOrder.orderDate),
            status: mapTrendyolOrderStatus(trendyolOrder.status),
            total_amount: trendyolOrder.totalPrice || 0,
            currency: 'TRY',
            customer_first_name: trendyolOrder.customerFirstName || '',
            customer_last_name: trendyolOrder.customerLastName || '',
            customer_email: trendyolOrder.customerEmail || '',
            shipping_address: JSON.stringify(trendyolOrder.shipmentAddress || {}),
            billing_address: JSON.stringify(trendyolOrder.invoiceAddress || {}),
            payment_method: trendyolOrder.paymentType || 'unknown',
            notes: `Imported from Trendyol - Order ID: ${trendyolOrder.orderNumber} - Status: ${trendyolOrder.status}`,
            is_active: true
          };

          if (!existingOrder) {
            await Order.create(orderData);
            importedCount++;
            logger.info(`Created new order ${trendyolOrder.orderNumber} with status: ${trendyolOrder.status}`);
          } else {
            // Update existing order if status has changed
            const currentStatus = mapTrendyolOrderStatus(trendyolOrder.status);
            if (existingOrder.status !== currentStatus) {
              await existingOrder.update({
                status: currentStatus,
                notes: `Updated from Trendyol - Order ID: ${trendyolOrder.orderNumber} - Status: ${trendyolOrder.status}`,
                total_amount: trendyolOrder.totalPrice || existingOrder.total_amount
              });
              updatedCount++;
              logger.info(`Updated order ${trendyolOrder.orderNumber} status from ${existingOrder.status} to ${currentStatus}`);
            }
          }
        } catch (error) {
          errors.push({
            order: trendyolOrder.orderNumber,
            error: error.message
          });
          logger.error(`Failed to import/update order ${trendyolOrder.orderNumber}:`, error);
        }
      }
    }

    logger.info(`Order import completed: ${importedCount} new orders, ${updatedCount} updated orders`);

    return {
      imported: importedCount,
      updated: updatedCount,
      total: ordersData.orders?.length || 0,
      errors: errors.length
    };
  } catch (error) {
    logger.error('Failed to import Trendyol orders:', error);
    throw error;
  }
}

// Helper function to map Trendyol order status to our system
function mapTrendyolOrderStatus(trendyolStatus) {
  const statusMap = {
    'Created': 'pending',           // Sipariş oluşturuldu
    'Confirmed': 'confirmed',       // Sipariş onaylandı
    'Picking': 'processing',        // Hazırlanıyor
    'Picked': 'processing',         // Hazırlandı
    'Invoiced': 'processing',       // Faturalandı
    'Shipped': 'shipped',           // Kargoya verildi
    'Delivered': 'delivered',       // Teslim edildi
    'UnDelivered': 'returned',      // Teslim edilemedi
    'Cancelled': 'cancelled',       // İptal edildi
    'Returned': 'returned'          // İade edildi
  };
  
  const mappedStatus = statusMap[trendyolStatus];
  if (!mappedStatus) {
    logger.warn(`Unknown Trendyol order status: ${trendyolStatus}, defaulting to 'pending'`);
  }
  
  return mappedStatus || 'pending';
}

// @desc    Import products from Trendyol
// @route   POST /api/v1/sync/import-trendyol-products
// @access  Private
router.post('/import-trendyol-products', protect, async (req, res) => {
  try {
    const { page = 0, size = 50, approved = true, fullImport = false } = req.body;
    const userId = req.user.id; // Use actual user ID from token

    // Get user's Trendyol credentials (user keys have priority, fallback to env)
    const userCredentials = await getUserTrendyolCredentials(userId);
    
    if (!userCredentials) {
      return res.status(400).json({
        success: false,
        error: 'Trendyol API credentials not found. Please add your Trendyol API keys in the marketplace keys section.',
        action: 'add_api_keys',
        marketplace: 'trendyol'
      });
    }

    // Import TrendyolAdapter directly
    const TrendyolAdapter = require('../../adapters/TrendyolAdapter');

    // Create Trendyol adapter with user credentials
    const trendyolConfig = {
      apiKey: userCredentials.apiKey,
      apiSecret: userCredentials.apiSecret,
      supplierId: userCredentials.supplierId,
      baseUrl: process.env.TRENDYOL_BASE_URL || 'https://apigw.trendyol.com'
    };

    const trendyolAdapter = new TrendyolAdapter(trendyolConfig);

    logger.info(`Using ${userCredentials.source} Trendyol credentials for user ${req.user.email}`);

    // Check if user has any products
    const userProductCount = await Product.count({ where: { user_id: userId } });
    const shouldFullImport = userProductCount === 0 || fullImport;

    logger.info(`Starting Trendyol product import - page: ${page}, size: ${size}, fullImport: ${shouldFullImport}, userProducts: ${userProductCount}`);

    // If no products exist, do a full import
    const importSize = shouldFullImport ? Math.max(size, 100) : size;

    // Fetch products from Trendyol
    const trendyolData = await trendyolAdapter.getProducts({ page, size: importSize, approved });
    
    if (!trendyolData.products || trendyolData.products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found on Trendyol'
      });
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each Trendyol product
    for (const trendyolProduct of trendyolData.products) {
      try {
        // Check for duplicate products by marketplace_product_id (not by name)
        let existingProductMarketplace = null;
        if (trendyolProduct.id) {
          existingProductMarketplace = await ProductMarketplace.findOne({
            where: {
              marketplace: 'trendyol',
              marketplace_product_id: trendyolProduct.id?.toString()
            },
            include: [{
              model: Product,
              as: 'product',
              where: { user_id: userId }
            }]
          });
        }

        if (existingProductMarketplace) {
          skippedCount++;
          logger.info(`Skipped duplicate product (ID: ${trendyolProduct.id}): ${trendyolProduct.title}`);
          continue;
        }

        // Map Trendyol product to our database schema
        const productData = mapTrendyolProductToDatabase(trendyolProduct, userId);
        
        // Create product
        const product = await Product.create(productData);
        
        // Create product category if available (full import mode)
        if (shouldFullImport && trendyolProduct.category) {
          try {
            await ProductCategory.create({
              name: trendyolProduct.category.name || 'Imported Category',
              slug: (trendyolProduct.category.name || 'imported-category').toLowerCase().replace(/[^a-z0-9]/g, '-'),
              description: `Imported from Trendyol: ${trendyolProduct.category.name}`,
              path: trendyolProduct.category.path || 'Imported',
              is_active: true
            });
          } catch (error) {
            logger.warn(`Failed to create category: ${error.message}`);
          }
        }

        // Create product images (if available)
        if (trendyolProduct.images && trendyolProduct.images.length > 0) {
          for (let i = 0; i < trendyolProduct.images.length; i++) {
            const image = trendyolProduct.images[i];
            // Only create image if URL is available
            if (image.url) {
              try {
                // Truncate URL if too long for database column (max 500 chars)
                const imageUrl = image.url?.substring(0, 500) || '';
                const altText = `${product.name} - Image ${i + 1}`.substring(0, 200);
                
                await ProductImage.create({
                  product_id: product.id,
                  image_url: imageUrl,
                  alt_text: altText,
                  display_order: i,
                  is_main: i === 0
                });
              } catch (error) {
                logger.error(`Failed to create image for product ${product.id}: ${error.message || error.original?.message || 'Unknown error'}`);
                logger.error('Image creation details:', {
                  productId: product.id,
                  imageUrl: image.url,
                  imageSize: image.url?.length || 0,
                  errorType: error.constructor.name,
                  sqlError: error.original?.message || error.sql || 'No SQL details',
                  fullError: error.toString()
                });
              }
            }
          }
        }

        // Create marketplace listing (for Trendyol integration tracking)
        try {
          await ProductMarketplace.create({
            product_id: product.id,
            marketplace: 'trendyol',
            marketplace_product_id: trendyolProduct.id?.toString(),
            marketplace_sku: trendyolProduct.productMainId,
            status: trendyolProduct.approved ? 'active' : 'pending',
            price: trendyolProduct.salePrice,
            discounted_price: trendyolProduct.salePrice,
            stock_quantity: trendyolProduct.quantity || 0,
            is_active: true,
            auto_sync: true,
            price_multiplier: 1,
            stock_buffer: 0,
            last_sync_date: new Date()
          });
        } catch (error) {
          logger.error(`Failed to create marketplace listing for product ${product.id}: ${error.message}`);
          logger.error('Marketplace listing creation details:', {
            productId: product.id,
            trendyolProductId: trendyolProduct.id,
            error: error.stack,
            sqlMessage: error.original?.message || 'No SQL details'
          });
        }

        // Create variants (IMPROVED VERSION with attributes)
        let variantCreatedCount = 0;
        try {
          if (trendyolProduct.variants && trendyolProduct.variants.length > 0) {
            logger.info(`Creating ${trendyolProduct.variants.length} variants for product ${product.id}`);
            
            for (const variant of trendyolProduct.variants) {
              try {
                // Parse variant attributes
                const variantAttributes = parseTrendyolVariantAttributes(variant, trendyolProduct);
                
                // Generate variant name from attributes
                const variantName = generateVariantName(product.name, variantAttributes);
                
                // Generate unique SKU with existence check
                let variantSku = variant.barcode || `${product.id}-${trendyolProduct.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Check if SKU already exists, if so generate a new one
                const existingVariant = await ProductVariant.findOne({ where: { sku: variantSku } });
                if (existingVariant) {
                  variantSku = `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
                
                // Create variant
                const createdVariant = await ProductVariant.create({
                  product_id: product.id,
                  name: variantName.substring(0, 200), // Ensure length limit
                  sku: variantSku,
                  barcode: variant.barcode,
                  price: variant.salePrice || product.base_price,
                  discounted_price: variant.salePrice || product.base_price,
                  stock: variant.quantity || 0,
                  weight: variant.dimensionalWeight,
                  length: variant.desi || null,
                  width: null,
                  height: null,
                  is_active: true
                });
                
                // Create variant attributes
                if (variantAttributes.length > 0) {
                  for (const attribute of variantAttributes) {
                    try {
                      await ProductVariantAttribute.create({
                        variant_id: createdVariant.id,
                        attribute_name: attribute.attribute_name.substring(0, 100),
                        attribute_value: attribute.attribute_value.substring(0, 500),
                        attribute_group: attribute.attribute_group || 'variant'
                      });
                    } catch (attrError) {
                      logger.warn(`Failed to create variant attribute for variant ${createdVariant.id}: ${attrError.message}`);
                    }
                  }
                  
                  logger.info(`Created variant ${createdVariant.id} with ${variantAttributes.length} attributes: ${variantName}`);
                } else {
                  logger.info(`Created variant ${createdVariant.id} without attributes: ${variantName}`);
                }
                
                variantCreatedCount++;
              } catch (variantError) {
                logger.error(`Failed to create variant for product ${product.id}:`, variantError.message);
                logger.error('Variant error details:', {
                  productId: product.id,
                  variantData: variant,
                  error: variantError.stack
                });
              }
            }
          } else {
            // Create a default variant - every product needs at least one variant
            try {
              let defaultSku = trendyolProduct.productMainId || `${product.id}-default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              // Check if SKU already exists, if so generate a new one
              const existingDefaultVariant = await ProductVariant.findOne({ where: { sku: defaultSku } });
              if (existingDefaultVariant) {
                defaultSku = `${product.id}-default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              }
              
              const defaultVariant = await ProductVariant.create({
                product_id: product.id,
                name: `${product.name} - Default`,
                sku: defaultSku,
                barcode: trendyolProduct.barcode,
                price: product.base_price,
                discounted_price: product.base_price,
                stock: trendyolProduct.quantity || 0,
                is_active: true
              });
              
              // Add default attributes if available
              const defaultAttributes = [];
              if (trendyolProduct.brand) {
                defaultAttributes.push({
                  attribute_name: 'Marka',
                  attribute_value: trendyolProduct.brand,
                  attribute_group: 'product'
                });
              }
              
              for (const attribute of defaultAttributes) {
                try {
                  await ProductVariantAttribute.create({
                    variant_id: defaultVariant.id,
                    attribute_name: attribute.attribute_name,
                    attribute_value: attribute.attribute_value,
                    attribute_group: attribute.attribute_group
                  });
                } catch (attrError) {
                  logger.warn(`Failed to create default variant attribute: ${attrError.message}`);
                }
              }
              
              variantCreatedCount++;
              logger.info(`Created default variant ${defaultVariant.id} with ${defaultAttributes.length} attributes`);
            } catch (defaultVariantError) {
              logger.error(`Failed to create default variant for product ${product.id}:`, defaultVariantError.message);
            }
          }
        } catch (error) {
          logger.error(`Failed to create variants for product ${product.id}: ${error.message}`);
          logger.error('Variant creation details:', {
            productId: product.id,
            error: error.stack,
            sqlMessage: error.original?.message || 'No SQL details',
            validationErrors: error.errors || 'No validation details',
            variantCreatedCount: variantCreatedCount
          });
        }

        importedCount++;
        logger.info(`✅ Imported product (ID: ${trendyolProduct.id}): ${product.name} with ${variantCreatedCount} variants`);

      } catch (error) {
        errorCount++;
        errors.push({
          product: trendyolProduct.title || 'Unknown',
          error: error.message
        });
        logger.error(`Failed to import product ${trendyolProduct.title}:`, error);
      }
    }

    // Import orders if full import is requested
    let orderImportResult = null;
    if (shouldFullImport) {
      try {
        orderImportResult = await importTrendyolOrders(trendyolAdapter, userId);
        logger.info(`Order import completed: ${orderImportResult.imported} orders imported`);
      } catch (error) {
        logger.error('Order import failed:', error);
        orderImportResult = { imported: 0, errors: 1 };
      }
    }

    // Create sync log (simplified for schema compatibility)
    try {
      await SyncLog.create({
        user_id: userId,
        marketplace: 'trendyol',
        operation: 'product_sync',
        entity: 'product',
        status: errorCount === 0 ? 'success' : (importedCount > 0 ? 'warning' : 'error'),
        direction: 'import',
        is_bulk_operation: true,
        started_at: new Date(),
        completed_at: new Date(),
        total_items: trendyolData.products.length,
        processed_items: importedCount + skippedCount + errorCount,
        successful_items: importedCount,
        failed_items: errorCount,
        error_message: errors.length > 0 ? JSON.stringify(errors) : null
      });
    } catch (syncLogError) {
      logger.warn('Failed to create sync log:', syncLogError.message);
    }

    logger.info(`🎉 Trendyol import completed - Imported: ${importedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

    res.status(200).json({
      success: true,
      message: 'Trendyol product import completed',
      data: {
        totalFound: trendyolData.products.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        totalElements: trendyolData.totalElements,
        totalPages: trendyolData.totalPages,
        currentPage: trendyolData.page,
        fullImport: shouldFullImport,
        orders: orderImportResult,
        errorDetails: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    logger.error('Trendyol product import failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during Trendyol product import',
      details: error.message
    });
  }
});

// Helper function to map Trendyol product to database schema
function mapTrendyolProductToDatabase(trendyolProduct, userId) {
  return {
    user_id: userId,
    name: (trendyolProduct.title || 'Imported Product').substring(0, 200),
    description: (trendyolProduct.description || trendyolProduct.title || 'Imported from Trendyol').substring(0, 2000),
    short_description: (trendyolProduct.description || '').substring(0, 500),
    brand: (trendyolProduct.brand || 'Unknown Brand').substring(0, 100),
    base_price: trendyolProduct.salePrice || trendyolProduct.listPrice || 0,
    currency: 'TRY',
    status: trendyolProduct.approved ? 'active' : 'draft',
    published_at: trendyolProduct.approved ? new Date() : null,
    total_stock: trendyolProduct.quantity || 0,
    total_sales: 0,
    average_rating: 0,
    review_count: 0,
    is_active: true
  };
}

// @desc    Sync all products to marketplaces
// @route   POST /api/v1/sync/products
// @access  Private
router.post('/products', protect, async (req, res) => {
  try {
    const { marketplaces, productIds } = req.body;

    // Get products to sync
    const where = { user_id: req.user.id };
    if (productIds && productIds.length > 0) {
      where.id = { [Op.in]: productIds };
    }

    const products = await Product.findAll({ 
      where,
      include: [
        {
          association: 'marketplaceListings',
          where: { is_active: true },
          required: false
        }
      ]
    });
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No products found to sync'
      });
    }

    const results = {};
    for (const product of products) {
      const targetMarketplaces = marketplaces || 
        (product.marketplaceListings || [])
          .filter(listing => listing.is_active)
          .map(listing => listing.marketplace);

      if (targetMarketplaces.length > 0) {
        results[product.id] = await adapterManager.syncProductToMarketplaces(
          req.user.id,
          product,
          targetMarketplaces
        );
      }
    }

    logger.info(`Bulk product sync initiated for ${products.length} products by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Product sync initiated',
      totalProducts: products.length,
      results
    });
  } catch (error) {
    logger.error('Bulk product sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during product sync'
    });
  }
});

// @desc    Import orders from marketplaces
// @route   POST /api/v1/sync/orders
// @access  Private
router.post('/orders', protect, async (req, res) => {
  try {
    const { marketplaces, startDate, endDate } = req.body;

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const results = await adapterManager.importOrdersFromMarketplaces(
      req.user.id,
      params
    );

    // Save imported orders
    let totalNewOrders = 0;
    for (const [marketplace, result] of Object.entries(results)) {
      if (result.success && result.data.orders) {
        for (const orderData of result.data.orders) {
          try {
            const existingOrder = await Order.findOne({
              where: {
                user_id: req.user.id,
                marketplace: marketplace,
                marketplace_order_id: orderData.marketplace.orderId
              }
            });

            if (!existingOrder) {
              const orderToCreate = {
                ...orderData,
                user_id: req.user.id,
                marketplace: marketplace,
                marketplace_order_id: orderData.marketplace.orderId
              };
              
              // Remove nested objects that don't fit MSSQL schema
              delete orderToCreate.marketplace;
              orderToCreate.marketplace = marketplace;
              
              const order = await Order.create(orderToCreate);
              totalNewOrders++;
            }
          } catch (error) {
            logger.error(`Failed to save order from ${marketplace}:`, error);
          }
        }
      }
    }

    logger.info(`Order sync completed: ${totalNewOrders} new orders imported by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Order sync completed',
      newOrders: totalNewOrders,
      results
    });
  } catch (error) {
    logger.error('Order sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during order sync'
    });
  }
});

// @desc    Get sync logs
// @route   GET /api/v1/sync/logs
// @access  Private
router.get('/logs', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      marketplace,
      operation,
      status,
      entity,
      startDate,
      endDate
    } = req.query;

    const where = { user_id: req.user.id };
    
    if (marketplace) where.marketplace = marketplace;
    if (operation) where.operation = operation;
    if (status) where.status = status;
    if (entity) where.entity = entity;
    
    if (startDate || endDate) {
      const dateCondition = {};
      if (startDate) dateCondition[Op.gte] = new Date(startDate);
      if (endDate) dateCondition[Op.lte] = new Date(endDate);
      if (Object.keys(dateCondition).length > 0) {
        where.started_at = dateCondition;
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await SyncLog.findAndCountAll({
      where,
      order: [['started_at', 'DESC']],
      offset,
      limit: parseInt(limit),
      include: [
        {
          association: 'user',
          attributes: ['name', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      count: logs.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: logs
    });
  } catch (error) {
    logger.error('Get sync logs failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching sync logs'
    });
  }
});

// @desc    Get sync statistics
// @route   GET /api/v1/sync/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      pendingSyncs,
      recentSyncs
    ] = await Promise.all([
      SyncLog.count({ where: { user_id: userId } }),
      SyncLog.count({ where: { user_id: userId, status: 'success' } }),
      SyncLog.count({ where: { user_id: userId, status: 'failed' } }),
      SyncLog.count({ where: { user_id: userId, status: 'pending' } }),
      SyncLog.count({ 
        where: { 
          user_id: userId, 
          started_at: { [Op.gte]: last24Hours } 
        } 
      })
    ]);

    // Get marketplace stats using raw SQL for better performance
    const { getSequelize } = require('../../config/database');
    const sequelize = getSequelize();
    
    const [syncsByMarketplace, syncsByOperation] = await Promise.all([
      sequelize.query(`
        SELECT 
          marketplace,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM sync_logs 
        WHERE user_id = :userId 
        GROUP BY marketplace
      `, {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }),
      sequelize.query(`
        SELECT 
          operation_type,
          COUNT(*) as count,
          AVG(DATEDIFF(second, started_at, completed_at)) as avgExecutionTime
        FROM sync_logs 
        WHERE user_id = :userId AND completed_at IS NOT NULL
        GROUP BY operation_type
        ORDER BY count DESC
      `, {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        pendingSyncs,
        recentSyncs,
        syncsByMarketplace,
        syncsByOperation
      }
    });
  } catch (error) {
    logger.error('Get sync stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching sync statistics'
    });
  }
});

// @desc    Import orders from Trendyol (all statuses)
// @route   POST /api/v1/sync/import-trendyol-orders
// @access  Private
router.post('/import-trendyol-orders', protect, async (req, res) => {
  try {
    const { days = 30, page = 0, size = 200 } = req.body;
    const userId = req.user.id;

    // Get user's Trendyol credentials
    const userCredentials = await getUserTrendyolCredentials(userId);
    
    if (!userCredentials) {
      return res.status(400).json({
        success: false,
        error: 'Trendyol API credentials not found. Please add your Trendyol API keys.',
        action: 'add_api_keys',
        marketplace: 'trendyol'
      });
    }

    // Import TrendyolAdapter
    const TrendyolAdapter = require('../../adapters/TrendyolAdapter');

    // Create Trendyol adapter with user credentials
    const trendyolConfig = {
      apiKey: userCredentials.apiKey,
      apiSecret: userCredentials.apiSecret,
      supplierId: userCredentials.supplierId,
      baseUrl: process.env.TRENDYOL_BASE_URL || 'https://apigw.trendyol.com'
    };

    const trendyolAdapter = new TrendyolAdapter(trendyolConfig);

    logger.info(`Starting Trendyol order import for user ${req.user.email} - last ${days} days, page: ${page}, size: ${size}`);
    logger.info(`Using ${userCredentials.source} Trendyol credentials`);

    // Get orders from specified days - ALL STATUSES
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const ordersData = await trendyolAdapter.getOrders({
      startDate: Math.floor(startDate.getTime() / 1000),
      endDate: Math.floor(endDate.getTime() / 1000),
      page,
      size,
      allStatuses: true // Get ALL status orders
    });

    if (!ordersData.orders || ordersData.orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No orders found in the last ${days} days across all statuses`
      });
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const statusCounts = {};

    // Process each order
    for (const trendyolOrder of ordersData.orders) {
      try {
        // Count orders by status
        const status = trendyolOrder.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Check if order already exists
        const existingOrder = await Order.findOne({
          where: {
            user_id: userId,
            marketplace_order_id: trendyolOrder.orderNumber
          }
        });

        // Map order data
        const orderData = {
          user_id: userId,
          marketplace: 'trendyol',
          marketplace_order_id: trendyolOrder.orderNumber,
          order_date: new Date(trendyolOrder.orderDate),
          status: mapTrendyolOrderStatus(trendyolOrder.status),
          total_amount: trendyolOrder.totalPrice || 0,
          currency: 'TRY',
          customer_first_name: trendyolOrder.customerFirstName || '',
          customer_last_name: trendyolOrder.customerLastName || '',
          customer_email: trendyolOrder.customerEmail || '',
          shipping_address: JSON.stringify(trendyolOrder.shipmentAddress || {}),
          billing_address: JSON.stringify(trendyolOrder.invoiceAddress || {}),
          payment_method: trendyolOrder.paymentType || 'unknown',
          notes: `Imported from Trendyol - Order ID: ${trendyolOrder.orderNumber} - Status: ${trendyolOrder.status}`,
          is_active: true
        };

        if (!existingOrder) {
          await Order.create(orderData);
          importedCount++;
        } else {
          // Update if status changed
          const currentStatus = mapTrendyolOrderStatus(trendyolOrder.status);
          if (existingOrder.status !== currentStatus) {
            await existingOrder.update({
              status: currentStatus,
              notes: `Updated from Trendyol - Order ID: ${trendyolOrder.orderNumber} - Status: ${trendyolOrder.status}`,
              total_amount: trendyolOrder.totalPrice || existingOrder.total_amount
            });
            updatedCount++;
          } else {
            skippedCount++;
          }
        }
      } catch (error) {
        errors.push({
          order: trendyolOrder.orderNumber,
          status: trendyolOrder.status,
          error: error.message
        });
        logger.error(`Failed to process order ${trendyolOrder.orderNumber}:`, error);
      }
    }

    // Create sync log
    try {
      await SyncLog.create({
        user_id: userId,
        marketplace: 'trendyol',
        operation: 'order_sync',
        entity: 'order',
        status: errors.length === 0 ? 'success' : (importedCount > 0 || updatedCount > 0 ? 'warning' : 'error'),
        direction: 'import',
        is_bulk_operation: true,
        started_at: new Date(),
        completed_at: new Date(),
        total_items: ordersData.orders.length,
        processed_items: importedCount + updatedCount + skippedCount,
        successful_items: importedCount + updatedCount,
        failed_items: errors.length,
        error_message: errors.length > 0 ? JSON.stringify(errors) : null
      });
    } catch (syncLogError) {
      logger.warn('Failed to create sync log:', syncLogError.message);
    }

    logger.info(`Trendyol order import completed - Imported: ${importedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`);

    res.status(200).json({
      success: true,
      message: `Trendyol order import completed for last ${days} days`,
      data: {
        totalFound: ordersData.orders.length,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.length,
        days: days,
        statusBreakdown: statusCounts,
        errorDetails: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    logger.error('Trendyol order import failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during Trendyol order import',
      details: error.message
    });
  }
});

module.exports = router; 