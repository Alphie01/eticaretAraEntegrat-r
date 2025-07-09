const express = require("express");
const { protect } = require("../../middleware/auth");
const UserAdapterManager = require("../../core/UserAdapterManager");
const { UserMarketplaceKeys } = require("../../models/UserMarketplaceKeys");
const logger = require("../../utils/logger");
const {
  SUPPORTED_MARKETPLACES,
  getMarketplaceDisplayName,
  getMarketplaceColor,
  getMarketplaceLogo,
  getMarketplaceDescription,
} = require("../../constants/marketplaces");

const router = express.Router();

// Cache for user adapter managers to avoid recreating them
const userAdapterManagers = new Map();

// Helper function to get or create user adapter manager
async function getUserAdapterManager(userId) {
  if (!userAdapterManagers.has(userId)) {
    const manager = new UserAdapterManager(userId);
    await manager.initialize();
    userAdapterManagers.set(userId, manager);
  }
  return userAdapterManagers.get(userId);
}

// @desc    Get user's marketplace configurations
// @route   GET /api/v1/marketplace
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const manager = await getUserAdapterManager(req.user.id);
    const activeMarketplaces = manager.getActiveMarketplaces();

    // Get user's marketplace keys for status info
    const userKeys = await UserMarketplaceKeys.findAll({
      where: { user_id: req.user.id },
      order: [
        ["marketplace", "ASC"],
        ["created_at", "DESC"],
      ],
    });

    const marketplaceConfigs = userKeys.map((key) => ({
      marketplace: key.marketplace,
      isActive: key.is_active,
      isConnected: activeMarketplaces.includes(key.marketplace),
      keyName: key.key_name,
      lastUsed: key.last_used_at,
      createdAt: key.created_at,
    }));

    res.status(200).json({
      success: true,
      data: {
        activeMarketplaces,
        configurations: marketplaceConfigs,
        totalActive: activeMarketplaces.length,
        message:
          activeMarketplaces.length === 0
            ? "No marketplace integrations configured. Please add your API credentials."
            : `${activeMarketplaces.length} marketplace integration(s) active: ${activeMarketplaces.join(", ")}`,
      },
    });
  } catch (error) {
    logger.error("Get user marketplaces failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching marketplace configurations",
    });
  }
});

// @desc    Add marketplace credentials
// @route   POST /api/v1/marketplace/:marketplace
// @access  Private
router.post("/:marketplace", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const credentials = req.body;

    console.log(req.user.id);
    console.log(credentials);
    console.log(marketplace);
    console.log("--------");
    const manager = await getUserAdapterManager(req.user.id);
    console.log(manager);
    await manager.addMarketplace(marketplace, credentials);
    console.log("--------");
    console.log(manager);

    logger.info(`Marketplace added: ${marketplace} for user ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: `${marketplace} marketplace credentials added successfully`,
    });
  } catch (error) {
    logger.error("Add marketplace failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error while adding marketplace",
    });
  }
});

// @desc    Update marketplace credentials
// @route   PUT /api/v1/marketplace/:marketplace
// @access  Private
router.put("/:marketplace", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const credentials = req.body;

    console.log(req.user.id);
    console.log(credentials);
    console.log(marketplace);
    console.log("--------");
    const manager = await getUserAdapterManager(req.user.id);
    await manager.updateMarketplace(marketplace, credentials);

    logger.info(
      `Marketplace updated: ${marketplace} for user ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      message: `${marketplace} marketplace credentials updated successfully`,
    });
  } catch (error) {
    logger.error("Update marketplace failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error while updating marketplace",
    });
  }
});

// @desc    Test marketplace connection
// @route   GET /api/v1/marketplace/:marketplace/test
// @access  Private
router.get("/:marketplace/test", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const manager = await getUserAdapterManager(req.user.id);

    if (!manager.hasMarketplace(marketplace)) {
      return res.status(404).json({
        success: false,
        error: `No configuration found for ${marketplace}. Please add your credentials first.`,
      });
    }

    const adapter = manager.getAdapter(marketplace);

    // Test with a simple API call
    await adapter.getProducts({ page: 0, size: 1 });

    const result = {
      success: true,
      marketplace,
      message: `${marketplace} connection test successful`,
      timestamp: new Date().toISOString(),
    };

    logger.info(
      `Marketplace connection test: ${marketplace} - SUCCESS by user ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Test marketplace connection failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during connection test",
    });
  }
});

// @desc    Test marketplace connection (POST version)
// @route   POST /api/v1/marketplace/:marketplace/test
// @access  Private
router.post("/:marketplace/test", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const manager = await getUserAdapterManager(req.user.id);

    if (!manager.hasMarketplace(marketplace)) {
      return res.status(404).json({
        success: false,
        error: `No configuration found for ${marketplace}. Please add your credentials first.`,
      });
    }

    const adapter = manager.getAdapter(marketplace);

    // Test with a simple API call
    await adapter.getProducts({ page: 0, size: 1 });

    const result = {
      success: true,
      marketplace,
      message: `${marketplace} connection test successful`,
      timestamp: new Date().toISOString(),
    };

    logger.info(
      `Marketplace connection test: ${marketplace} - SUCCESS by user ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Test marketplace connection failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during connection test",
    });
  }
});

// @desc    Get marketplace products
// @route   GET /api/v1/marketplace/:marketplace/products
// @access  Private
router.get("/:marketplace/products", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { page = 0, limit = 50, ...otherParams } = req.query;

    const manager = await getUserAdapterManager(req.user.id);
    const adapter = manager.getAdapter(marketplace);

    const result = await adapter.getProducts({
      page: parseInt(page),
      size: parseInt(limit),
      ...otherParams,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Get marketplace products failed:", error);
    res.status(500).json({
      success: false,
      error:
        error.message || "Server error while fetching marketplace products",
    });
  }
});

// @desc    Get marketplace orders
// @route   GET /api/v1/marketplace/:marketplace/orders
// @access  Private
router.get("/:marketplace/orders", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { page = 0, limit = 50, ...otherParams } = req.query;

    const manager = await getUserAdapterManager(req.user.id);
    const adapter = manager.getAdapter(marketplace);

    const result = await adapter.getOrders({
      page: parseInt(page),
      size: parseInt(limit),
      ...otherParams,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Get marketplace orders failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error while fetching marketplace orders",
    });
  }
});

// @desc    Get marketplace categories
// @route   GET /api/v1/marketplace/:marketplace/categories
// @access  Private
router.get("/:marketplace/categories", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const manager = await getUserAdapterManager(req.user.id);
    const adapter = manager.getAdapter(marketplace);

    const categories = await adapter.getCategories();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error("Get marketplace categories failed:", error);
    res.status(500).json({
      success: false,
      error:
        error.message || "Server error while fetching marketplace categories",
    });
  }
});

// @desc    Create product in marketplace
// @route   POST /api/v1/marketplace/:marketplace/products
// @access  Private
router.post("/:marketplace/products", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const productData = req.body;

    const manager = await getUserAdapterManager(req.user.id);
    const adapter = manager.getAdapter(marketplace);

    const result = await adapter.createProduct(productData);

    logger.info(`Product created in ${marketplace} by user ${req.user.email}`);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Create marketplace product failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error while creating marketplace product",
    });
  }
});

// @desc    Update product in marketplace
// @route   PUT /api/v1/marketplace/:marketplace/products/:productId
// @access  Private
router.put("/:marketplace/products/:productId", protect, async (req, res) => {
  try {
    const { marketplace, productId } = req.params;
    const productData = req.body;

    const manager = await getUserAdapterManager(req.user.id);
    const adapter = manager.getAdapter(marketplace);

    const result = await adapter.updateProduct(productId, productData);

    logger.info(
      `Product ${productId} updated in ${marketplace} by user ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Update marketplace product failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error while updating marketplace product",
    });
  }
});

// @desc    Update stock in marketplace
// @route   PUT /api/v1/marketplace/:marketplace/products/:productId/stock
// @access  Private
router.put(
  "/:marketplace/products/:productId/stock",
  protect,
  async (req, res) => {
    try {
      const { marketplace, productId } = req.params;
      const { stock, variantId } = req.body;

      const manager = await getUserAdapterManager(req.user.id);
      const adapter = manager.getAdapter(marketplace);

      const result = await adapter.updateStock(productId, stock, variantId);

      logger.info(
        `Stock updated for product ${productId} in ${marketplace} by user ${req.user.email}`
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Update marketplace stock failed:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Server error while updating marketplace stock",
      });
    }
  }
);

// @desc    Update price in marketplace
// @route   PUT /api/v1/marketplace/:marketplace/products/:productId/price
// @access  Private
router.put(
  "/:marketplace/products/:productId/price",
  protect,
  async (req, res) => {
    try {
      const { marketplace, productId } = req.params;
      const { price, variantId } = req.body;

      const manager = await getUserAdapterManager(req.user.id);
      const adapter = manager.getAdapter(marketplace);

      const result = await adapter.updatePrice(productId, price, variantId);

      logger.info(
        `Price updated for product ${productId} in ${marketplace} by user ${req.user.email}`
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Update marketplace price failed:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Server error while updating marketplace price",
      });
    }
  }
);

// @desc    Update order status in marketplace
// @route   PUT /api/v1/marketplace/:marketplace/orders/:orderId/status
// @access  Private
router.put(
  "/:marketplace/orders/:orderId/status",
  protect,
  async (req, res) => {
    try {
      const { marketplace, orderId } = req.params;
      const { status, trackingInfo } = req.body;

      const manager = await getUserAdapterManager(req.user.id);
      const adapter = manager.getAdapter(marketplace);

      const result = await adapter.updateOrderStatus(
        orderId,
        status,
        trackingInfo
      );

      logger.info(
        `Order ${orderId} status updated in ${marketplace} by user ${req.user.email}`
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Update marketplace order status failed:", error);
      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Server error while updating marketplace order status",
      });
    }
  }
);

// @desc    Get marketplace status summary
// @route   GET /api/v1/marketplace/status
// @access  Private
router.get("/status", protect, async (req, res) => {
  try {
    const manager = await getUserAdapterManager(req.user.id);
    const activeMarketplaces = manager.getActiveMarketplaces();

    // Get user's marketplace keys
    const userKeys = await UserMarketplaceKeys.findAll({
      where: { user_id: req.user.id },
    });

    // All available marketplaces
    const allMarketplaces = [
      "trendyol",
      "hepsiburada",
      "amazon",
      "n11",
      "shopify",
      "ciceksepeti",
      "pazarama",
      "pttavm",
    ];

    // Build marketplace data with user's actual status
    const marketplaceData = allMarketplaces.map((marketplace) => {
      const userKey = userKeys.find((key) => key.marketplace === marketplace);
      const isActive = activeMarketplaces.includes(marketplace);

      return {
        id: marketplace,
        name: getMarketplaceDisplayName(marketplace),
        logo: getMarketplaceLogo(marketplace),
        status: isActive
          ? "connected"
          : userKey && userKey.is_active
            ? "warning"
            : "error",
        orders: isActive ? Math.floor(Math.random() * 500) + 100 : 0, // Mock data for demo
        products: isActive ? Math.floor(Math.random() * 1000) + 200 : 0,
        revenue: isActive
          ? `₺${(Math.floor(Math.random() * 50000) + 5000).toLocaleString()}`
          : "₺0",
        color: getMarketplaceColor(marketplace),
        description: getMarketplaceDescription(marketplace),
        hasCredentials: !!userKey,
        lastUsed: userKey?.last_used_at,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        marketplaces: marketplaceData,
        summary: {
          activeCount: activeMarketplaces.length,
          totalConfigured: userKeys.length,
          activeMarketplaces,
        },
        message:
          activeMarketplaces.length === 0
            ? "No marketplace integrations are active. Please configure your API credentials."
            : `${activeMarketplaces.length} marketplace integration(s) active: ${activeMarketplaces.join(", ")}`,
      },
    });
  } catch (error) {
    logger.error("Get marketplace status failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching marketplace status",
    });
  }
});

// @desc    Get adapter statistics
// @route   GET /api/v1/marketplace/stats
// @access  Private
router.get("/stats", protect, async (req, res) => {
  try {
    const manager = await getUserAdapterManager(req.user.id);
    const activeMarketplaces = manager.getActiveMarketplaces();

    // Calculate stats (in production, these would come from actual data)
    const connectedCount = activeMarketplaces.length;
    const totalOrders =
      activeMarketplaces.length > 0
        ? Math.floor(Math.random() * 2000) + 500
        : 0;
    const totalProducts =
      activeMarketplaces.length > 0
        ? Math.floor(Math.random() * 5000) + 1000
        : 0;

    res.status(200).json({
      success: true,
      data: {
        connectedCount,
        totalOrders,
        totalProducts,
        activeMarketplaces,
      },
    });
  } catch (error) {
    logger.error("Get adapter stats failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching adapter statistics",
    });
  }
});

// @desc    Sync operations across user's marketplaces
// @route   POST /api/v1/marketplace/sync
// @access  Private
router.post("/sync", protect, async (req, res) => {
  try {
    const { operation, marketplaces, data } = req.body;

    if (!operation) {
      return res.status(400).json({
        success: false,
        error: "Operation is required",
      });
    }

    const manager = await getUserAdapterManager(req.user.id);
    const targetMarketplaces = marketplaces || manager.getActiveMarketplaces();

    const results = {};

    for (const marketplace of targetMarketplaces) {
      if (!manager.hasMarketplace(marketplace)) {
        results[marketplace] = {
          success: false,
          error: `No configuration found for ${marketplace}`,
        };
        continue;
      }

      try {
        const adapter = manager.getAdapter(marketplace);

        let result;
        switch (operation) {
          case "getProducts":
            result = await adapter.getProducts(data || {});
            break;
          case "getOrders":
            result = await adapter.getOrders(data || {});
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        results[marketplace] = {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error(
          `Sync operation ${operation} failed for ${marketplace}:`,
          error
        );
        results[marketplace] = {
          success: false,
          error: error.message || "Unknown error",
        };
      }
    }

    logger.info(
      `Sync operation ${operation} executed on ${targetMarketplaces.join(", ")} by user ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      message: "Sync operation completed",
      results,
    });
  } catch (error) {
    logger.error("Sync marketplace operation failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error during sync operation",
    });
  }
});

// @desc    Disable marketplace
// @route   DELETE /api/v1/marketplace/:marketplace
// @access  Private
router.delete("/:marketplace", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const manager = await getUserAdapterManager(req.user.id);
    await manager.disableMarketplace(marketplace);

    // Clear the manager from cache to reload it fresh next time
    userAdapterManagers.delete(req.user.id);

    logger.info(
      `Marketplace disabled: ${marketplace} for user ${req.user.email}`
    );
    res.status(200).json({
      success: true,
      message: `${marketplace} marketplace disabled successfully`,
    });
  } catch (error) {
    logger.error("Disable marketplace failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error while disabling marketplace",
    });
  }
});

// @desc    Debug endpoint to check database constraints
// @route   GET /api/v1/marketplace/debug/constraints
// @access  Public (for testing)
router.get("/debug/constraints", async (req, res) => {
  try {
    const { getSequelize } = require("../../config/database");
    const sequelize = getSequelize();

    // Query to find all CHECK constraints related to marketplace columns
    const checkConstraintsQuery = `
      SELECT 
        t.table_name,
        cc.constraint_name,
        cc.check_clause
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc 
        ON tc.constraint_name = cc.constraint_name
      JOIN INFORMATION_SCHEMA.TABLES t 
        ON tc.table_name = t.table_name
      WHERE cc.check_clause LIKE '%marketplace%'
      ORDER BY t.table_name, cc.constraint_name;
    `;

    const constraints = await sequelize.query(checkConstraintsQuery, {
      type: sequelize.QueryTypes.SELECT,
    });

    // Check which tables have marketplace columns
    const tablesWithMarketplaceQuery = `
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE COLUMN_NAME LIKE '%marketplace%'
      ORDER BY TABLE_NAME, COLUMN_NAME;
    `;

    const marketplaceColumns = await sequelize.query(
      tablesWithMarketplaceQuery,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: {
        supportedMarketplaces: SUPPORTED_MARKETPLACES,
        constraints,
        marketplaceColumns,
        constraintAnalysis: constraints.map((constraint) => ({
          table: constraint.table_name,
          constraint: constraint.constraint_name,
          checkClause: constraint.check_clause,
          hasAllMarketplaces: SUPPORTED_MARKETPLACES.every((mp) =>
            constraint.check_clause.includes(`'${mp}'`)
          ),
          missingMarketplaces: SUPPORTED_MARKETPLACES.filter(
            (mp) => !constraint.check_clause.includes(`'${mp}'`)
          ),
        })),
      },
    });
  } catch (error) {
    logger.error("Debug constraints check failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
