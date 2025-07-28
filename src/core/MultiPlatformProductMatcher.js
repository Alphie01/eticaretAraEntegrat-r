const ProductMatcher = require("./ProductMatcher");
const adapterManager = require("./AdapterManager");
const logger = require("../utils/logger");
const { Product, ProductMarketplace, sequelize } = require("../models");
const { Op } = require("sequelize");
const { name } = require("tedious/lib/data-types/null");

/**
 * Multi-platform ürün eşleştirme ve kaydetme sistemi
 * Tüm marketplace'lerden ürünleri alır, eşleştirir ve veritabanına kaydeder
 */
class MultiPlatformProductMatcher {
  constructor() {
    this.productMatcher = new ProductMatcher();
    this.supportedMarketplaces = [
      "trendyol",
      "hepsiburada",
      "amazon",
      "n11",
      "shopify",
      "ciceksepeti",
      "pazarama",
      "pttavm",
    ];
  }

  /**
   * Tüm platformlardan ürünleri al ve eşleştir
   * @param {number} userId - Kullanıcı ID
   * @param {Object} options - Eşleştirme seçenekleri
   */
  async matchAllPlatformProducts(userId, options = {}) {
    try {
      logger.info(
        `Starting multi-platform product matching for user ${userId}`
      );

      // 1. Tüm platformlardan ürünleri al
      const allPlatformProducts = await this.getAllPlatformProducts(
        userId,
        options.marketplaces
      );

      // 2. Platform başına ürün sayılarını log'la
      const platformCounts = {};
      for (const [marketplace, products] of Object.entries(
        allPlatformProducts
      )) {
        platformCounts[marketplace] = products.length;
      }
      logger.info("Platform product counts:", platformCounts);

      // 3. Ürünleri eşleştir
      const matchingResults = await this.performCrossplatformMatching(
        allPlatformProducts,
        options
      );

      // 4. Sonuçları özetle
      const summary = this.generateMatchingSummary(
        matchingResults,
        platformCounts
      );

      return {
        userId,
        timestamp: new Date(),
        platforms: Object.keys(allPlatformProducts),
        platformCounts,
        matching: matchingResults,
        summary,
        options,
      };
    } catch (error) {
      logger.error(`Multi-platform matching failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Tüm marketplace'lerden ürün verilerini al
   */
  async getAllPlatformProducts(userId, targetMarketplaces = null) {
    const marketplaces = targetMarketplaces || this.supportedMarketplaces;
    const allProducts = {};

    for (const marketplace of marketplaces) {
      try {
        logger.info(`Fetching products from ${marketplace}...`);

        const adapter = await adapterManager.getAdapter(userId, marketplace);
        const productsResponse = await adapter.getProducts({
          limit: 1000,
          page: 0,
        });

        const products = productsResponse.products || [];

        // Normalize ürün verilerini
        allProducts[marketplace] = products.map((product) =>
          this.normalizeProductData(product, marketplace)
        );

        logger.info(
          `Retrieved ${allProducts[marketplace].length} products from ${marketplace}`
        );
      } catch (error) {
        logger.warn(
          `Failed to fetch products from ${marketplace}: ${error.message}`
        );
        allProducts[marketplace] = []; // Boş array ile devam et
      }
    }

    return allProducts;
  }

  normalizeProducts(products, marketplace) {
    return products.map((product) =>
      this.normalizeProductData(product, marketplace)
    );
  }

  /**
   * Ürün verilerini standart formata normalize et
   */
  normalizeProductData(product, marketplace) {
    const normalized = {
      marketplace,
      originalData: product,
      // Unique identifier for this product in this marketplace
      marketplace_product_id: null,
      // Common fields
      sku: null,
      barcode: null,
      name: null,
      brand: null,
      price: 0,
      stock: 0,
      description: null,
      images: [],
      attributes: [],
      category: null,
      status: null,
    };

    // Marketplace'e göre field mapping
    switch (marketplace) {
      case "trendyol":
        var normalizedAttributes = product.attributes.map((attr) =>
          this.normalizeAttributes(attr, marketplace)
        );
        normalized.attributes = normalizedAttributes;
        normalized.marketplace_product_id = product.id || product.productMainId;
        normalized.sku = product.productMainId || product.barcode;
        normalized.barcode = product.barcode;
        normalized.name = product.title;
        normalized.brand = product.brand;
        normalized.price = parseFloat(product.salePrice) || 0;
        normalized.stock = parseInt(product.quantity) || 0;
        normalized.description = product.description;
        normalized.images = (product.images || []).map((img) =>
          typeof img === "string" ? img : img.url
        );
        normalized.category = product.category;
        normalized.status = product.approved ? "active" : "pending";
        break;

      case "hepsiburada":
        var normalizedAttributes = product.baseAttributes.map((attr) =>
          this.normalizeAttributes(attr, marketplace)
        );
        normalized.attributes = normalizedAttributes;
        normalized.marketplace_product_id =
          product.variantGroupId || product.merchantSku;
        normalized.sku = product.merchantSku;
        normalized.barcode = product.barcode;
        normalized.name = product.productName;
        normalized.brand = product.brand;
        normalized.price = parseFloat(product.price) || 0;
        normalized.stock = parseInt(product.availableStock) || 0;
        normalized.description = product.description;
        normalized.images = (product.images || []).map((img) =>
          typeof img === "string" ? img : img.url
        );
        normalized.category = product.categoryId;
        normalized.status = product.status || "active";
        break;

      case "amazon":
        normalized.marketplace_product_id = product.asin || product.sku;
        normalized.sku = product.sku;
        normalized.barcode = product.upc || product.ean;
        normalized.name = product.title;
        normalized.brand = product.brand;
        normalized.price = parseFloat(product.price) || 0;
        normalized.stock = parseInt(product.quantity) || 0;
        normalized.description = product.description;
        normalized.images = (product.images || []).map((img) =>
          typeof img === "string" ? img : img.url
        );
        normalized.category = product.productType;
        normalized.status = product.status;
        break;

      case "n11":
        normalized.marketplace_product_id = product.id || product.productId;
        normalized.sku = product.sellerStockCode || product.sku;
        normalized.barcode = product.gtin || product.barcode;
        normalized.name = product.title;
        normalized.brand = product.brand;
        normalized.price = parseFloat(product.price) || 0;
        normalized.stock = parseInt(product.quantity) || 0;
        normalized.description = product.description;
        normalized.images = (product.images || []).map((img) =>
          typeof img === "string" ? img : img.url
        );
        normalized.category = product.categoryId;
        normalized.status = product.status;
        break;

      case "shopify":
        const firstVariant = product.variants?.[0] || {};
        normalized.marketplace_product_id = product.id;
        normalized.sku = firstVariant.sku || product.sku;
        normalized.barcode = firstVariant.barcode || product.barcode;
        normalized.name = product.title;
        normalized.brand = product.vendor;
        normalized.price = parseFloat(firstVariant.price) || 0;
        normalized.stock = parseInt(firstVariant.inventory_quantity) || 0;
        normalized.description =
          product.body_html?.replace(/<[^>]*>/g, "") || "";
        normalized.images = (product.images || []).map(
          (img) => img.src || img.url || img
        );
        normalized.category = product.product_type;
        normalized.status = product.status;
        break;

      case "ciceksepeti":
        normalized.marketplace_product_id = product.id;
        normalized.sku = product.sku;
        normalized.barcode = product.barcode;
        normalized.name = product.name;
        normalized.brand = product.brand;
        normalized.price = parseFloat(product.price) || 0;
        normalized.stock = parseInt(product.stock) || 0;
        normalized.description = product.description;
        normalized.images = (product.images || []).map(
          (img) => img.url || img.src || img
        );
        normalized.category = product.categoryId || product.category;
        normalized.status = product.status;
        break;

      case "pazarama":
        normalized.marketplace_product_id = product.id;
        normalized.sku = product.code || product.sku;
        normalized.barcode = product.code || product.barcode;
        normalized.name = product.name || product.displayName;
        normalized.brand = product.brandId || product.brand;
        normalized.price =
          parseFloat(product.salePrice || product.listPrice || product.price) ||
          0;
        normalized.stock = parseInt(product.stockCount || product.stock) || 0;
        normalized.description = product.description;
        normalized.images = (product.images || []).map(
          (img) => img.imageUrl || img.url || img
        );
        normalized.category = product.categoryId || product.category;
        normalized.status = product.isActive ? "active" : "inactive";
        break;

      case "pttavm":
        normalized.marketplace_product_id = product.id || product.productId;
        normalized.sku = product.barcode || product.modelCode || product.sku;
        normalized.barcode = product.barcode;
        normalized.name = product.name;
        normalized.brand = product.brandId || product.brand;
        normalized.price = parseFloat(product.price || product.listPrice) || 0;
        normalized.stock = parseInt(product.stock) || 0;
        normalized.description = product.description;
        normalized.images = (product.images || []).map(
          (img) => img.url || img.src || img
        );
        normalized.category = product.categoryId || product.category;
        normalized.status = product.isActive ? "active" : "inactive";
        break;

      default:
        // Generic mapping
        normalized.marketplace_product_id = product.id || product.sku;
        normalized.sku = product.sku;
        normalized.barcode = product.barcode;
        normalized.name = product.name || product.title;
        normalized.brand = product.brand;
        normalized.price = parseFloat(product.price) || 0;
        normalized.stock = parseInt(product.stock || product.quantity) || 0;
        normalized.description = product.description;
        normalized.images = (product.images || []).map((img) =>
          typeof img === "string" ? img : img.url || img.src
        );
        normalized.category = product.category;
        normalized.status = product.status;
    }

    // Clean up data
    normalized.name = normalized.name?.trim() || "";
    normalized.brand = normalized.brand?.trim() || "";
    normalized.description = normalized.description?.trim() || "";

    return normalized;
  }

  /**
   * Cross-platform eşleştirme gerçekleştir
   */

  normalizeAttributes(attribute, marketplace) {
    switch (marketplace) {
      case "trendyol":
        return {
          name: attribute.attributeName,
          value: attribute.attributeValue,
        };
      case "hepsiburada":
        return {
          name: attribute.name,
          value: attribute.value,
        };
      default:
        return {
          name: attribute.name,
          value: attribute.value,
        };
    }
  }

  async performCrossplatformMatching(allPlatformProducts, options = {}) {
    const productGroups = []; // Eşleştirilen ürün grupları
    const unmatchedProducts = {}; // Eşleşmeyen ürünler

    // Tüm ürünleri tek bir array'e topla
    const allProducts = [];
    for (const [marketplace, products] of Object.entries(allPlatformProducts)) {
      allProducts.push(...products);
    }

    logger.info(
      `Starting cross-platform matching for ${allProducts.length} total products`
    );

    // Zaten eşleşmiş ürünleri takip et
    const processedProducts = new Set();

    for (const product of allProducts) {
      // Bu ürün zaten işlendiyse geç
      const productId = `${product.marketplace}_${product.marketplace_product_id || product.sku}`;
      if (processedProducts.has(productId)) {
        continue;
      }

      // Bu ürün için eşleştirmeler bul
      const productGroup = {
        products: [product],
        matchCriteria: [],
        confidence: 1.0,
      };

      // Diğer marketplace'lerdeki eşleştirmeleri bul
      for (const [otherMarketplace, otherProducts] of Object.entries(
        allPlatformProducts
      )) {
        if (otherMarketplace === product.marketplace) continue;

        for (const otherProduct of otherProducts) {
          const otherProductId = `${otherProduct.marketplace}_${otherProduct.marketplace_product_id || otherProduct.sku}`;
          if (processedProducts.has(otherProductId)) continue;

          // Eşleştirme testi yap
          const matchResult = this.testProductMatch(
            product,
            otherProduct,
            options
          );

          if (matchResult.isMatch) {
            productGroup.products.push(otherProduct);
            productGroup.matchCriteria.push(matchResult.criteria);
            productGroup.confidence = Math.min(
              productGroup.confidence,
              matchResult.confidence
            );
            processedProducts.add(otherProductId);
          }
        }
      }

      // Bu ürünü işlendi olarak işaretle
      processedProducts.add(productId);

      // Grup oluştu mu kontrol et
      if (productGroup.products.length > 1) {
        productGroups.push(productGroup);
      } else {
        // Tek başına kalan ürün
        const marketplace = product.marketplace;
        if (!unmatchedProducts[marketplace]) {
          unmatchedProducts[marketplace] = [];
        }
        unmatchedProducts[marketplace].push(product);
      }
    }

    logger.info(
      `Cross-platform matching completed: ${productGroups.length} groups, ${Object.keys(unmatchedProducts).length} unmatched platforms`
    );

    return {
      productGroups,
      unmatchedProducts,
      totalProcessed: allProducts.length,
      totalMatched: productGroups.reduce(
        (sum, group) => sum + group.products.length,
        0
      ),
    };
  }

  /**
   * İki ürün arasında eşleştirme testi yap
   */
  testProductMatch(product1, product2, options = {}) {
    const {
      strictMatching = false,
      similarityThreshold = 0.85,
      ignoreBrand = false,
    } = options;

    // 1. Exact SKU match (en güvenilir)
    if (product1.sku && product2.sku) {
      const sku1 = this.productMatcher.normalizeSku(product1.sku);
      const sku2 = this.productMatcher.normalizeSku(product2.sku);

      if (sku1 === sku2 && sku1.length > 3) {
        // En az 4 karakter olmalı
        return {
          isMatch: true,
          criteria: "exact_sku",
          confidence: 1.0,
        };
      }
    }

    // 2. Barcode match
    if (
      product1.barcode &&
      product2.barcode &&
      product1.barcode === product2.barcode &&
      product1.barcode.length >= 8
    ) {
      // En az 8 karakter barcode
      return {
        isMatch: true,
        criteria: "barcode",
        confidence: 0.95,
      };
    }

    // 3. Brand + Name exact match
    if (
      !ignoreBrand &&
      product1.brand &&
      product2.brand &&
      product1.name &&
      product2.name
    ) {
      const brand1 = this.productMatcher.normalizeBrand(product1.brand);
      const brand2 = this.productMatcher.normalizeBrand(product2.brand);

      if (brand1 === brand2) {
        const name1 = this.productMatcher.normalizeString(product1.name);
        const name2 = this.productMatcher.normalizeString(product2.name);

        if (name1 === name2) {
          return {
            isMatch: true,
            criteria: "brand_name_exact",
            confidence: 0.9,
          };
        }
      }
    }

    // 4. Name similarity (fuzzy matching)
    if (!strictMatching && product1.name && product2.name) {
      const similarity = this.productMatcher.calculateSimilarity(
        product1.name,
        product2.name
      );

      if (similarity >= similarityThreshold) {
        // Brand kontrolü (eğer brand varsa)
        let brandMatch = true;
        if (!ignoreBrand && product1.brand && product2.brand) {
          const brand1 = this.productMatcher.normalizeBrand(product1.brand);
          const brand2 = this.productMatcher.normalizeBrand(product2.brand);
          brandMatch = brand1 === brand2;
        }

        if (brandMatch) {
          return {
            isMatch: true,
            criteria: "name_similarity",
            confidence: similarity * (brandMatch && product1.brand ? 1.0 : 0.8),
          };
        }
      }
    }

    return {
      isMatch: false,
      criteria: "no_match",
      confidence: 0,
    };
  }

  normalizeCategory(categories, marketplace) {
    switch (marketplace) {
      case "trendyol":
        return this.normalizeTrendyol(categories, marketplace);

      case "hepsiburada":
        return categories.map((cat) => ({
          categoryId: cat.categoryId,
          name: cat.name,
          slug: cat.slug || "",
          description: cat.description || "",
          isActive: cat.status == "ACTIVE",
          marketplace: marketplace,
          displayName: cat.displayName || cat.name,
          parentId: cat.parentCategoryId || null,
        }));

      default:
        break;
    }
  }

  normalizeTrendyol(data, marketplace = "default") {
    const result = [];

    function traverse(category, parentId = null) {
      const normalized = {
        categoryId: category.id,
        name: category.name,
        slug: category.slug || "",
        description: category.description || "",
        isActive: category.isActive ?? true,
        marketplace: marketplace,
        displayName: category.displayName || category.name,
        parentId: parentId,
      };

      result.push(normalized);

      if (
        Array.isArray(category.subCategories) &&
        category.subCategories.length > 0
      ) {
        for (const sub of category.subCategories) {
          traverse(sub, category.id);
        }
      }
    }

    for (const category of data) {
      traverse(category, category.parentId);
    }

    return result;
  }

  /**
   * Eşleştirilen ürünleri veritabanına kaydet
   */
  async saveMatchedProductsToDatabase(userId, matchingResults, options = {}) {
    const { overwriteExisting = false, createMissingCategories = true } =
      options;

    const results = {
      savedProducts: 0,
      skippedProducts: 0,
      errors: [],
      productDetails: [],
    };

    // Transaction ile kaydet
    const transaction = await sequelize.transaction();

    try {
      for (const productGroup of matchingResults.productGroups) {
        try {
          // Ana ürün oluştur (ilk ürün master olsun)
          const masterProduct = productGroup.products[0];

          // Mevcut ürün var mı kontrol et
          let existingProduct = null;
          if (masterProduct.sku) {
            existingProduct = await Product.findOne({
              where: {
                user_id: userId,
                [Op.or]: [
                  { name: masterProduct.name },
                  ...(masterProduct.sku
                    ? [
                        {
                          "$marketplaceListings.marketplace_sku$":
                            masterProduct.sku,
                        },
                      ]
                    : []),
                ],
              },
              include: ["marketplaceListings"],
              transaction,
            });
          }

          let product;
          if (existingProduct && !overwriteExisting) {
            // Mevcut ürünü kullan
            product = existingProduct;
            results.skippedProducts++;
          } else {
            // Yeni ürün oluştur veya güncelle
            const productData = {
              user_id: userId,
              name: masterProduct.name,
              description: masterProduct.description || "",
              brand: masterProduct.brand || "",
              base_price: masterProduct.price,
              currency: "TRY",
              status: "active",
              total_stock: productGroup.products.reduce(
                (sum, p) => sum + p.stock,
                0
              ),
              is_active: true,
            };

            if (existingProduct) {
              // Güncelle
              await existingProduct.update(productData, { transaction });
              product = existingProduct;
            } else {
              // Yeni ürün oluştur
              product = await Product.create(productData, { transaction });
            }

            results.savedProducts++;
          }

          // Her platform için ProductMarketplace kaydı oluştur
          for (const platformProduct of productGroup.products) {
            // Mevcut marketplace kaydı var mı?
            const existingMarketplace = await ProductMarketplace.findOne({
              where: {
                product_id: product.id,
                marketplace: platformProduct.marketplace,
              },
              transaction,
            });

            const marketplaceData = {
              product_id: product.id,
              marketplace: platformProduct.marketplace,
              marketplace_product_id: platformProduct.marketplace_product_id,
              marketplace_sku: platformProduct.sku,
              barcode: platformProduct.barcode,
              price: platformProduct.price,
              stock_quantity: platformProduct.stock,
              status: platformProduct.status || "active",
              is_active: true,
              custom_title: platformProduct.name,
              custom_description: platformProduct.description,
              last_sync_date: new Date(),
              sync_status: "success",
            };

            if (existingMarketplace) {
              if (overwriteExisting) {
                await existingMarketplace.update(marketplaceData, {
                  transaction,
                });
              }
            } else {
              await ProductMarketplace.create(marketplaceData, { transaction });
            }
          }

          results.productDetails.push({
            productId: product.id,
            name: product.name,
            platforms: productGroup.products.map((p) => p.marketplace),
            confidence: productGroup.confidence,
            matchCriteria: productGroup.matchCriteria,
          });
        } catch (error) {
          logger.error(`Error saving product group: ${error.message}`, error);
          results.errors.push({
            productGroup: productGroup.products[0]?.name || "Unknown",
            error: error.message,
          });
        }
      }

      // Unmatched ürünleri de kaydet (opsiyonel)
      for (const [marketplace, products] of Object.entries(
        matchingResults.unmatchedProducts
      )) {
        for (const unmatchedProduct of products) {
          try {
            // Tek başına ürün oluştur
            const productData = {
              user_id: userId,
              name: unmatchedProduct.name,
              description: unmatchedProduct.description || "",
              brand: unmatchedProduct.brand || "",
              base_price: unmatchedProduct.price,
              currency: "TRY",
              status: "active",
              total_stock: unmatchedProduct.stock,
              is_active: true,
            };

            const product = await Product.create(productData, { transaction });

            // Marketplace kaydı
            await ProductMarketplace.create(
              {
                product_id: product.id,
                marketplace: unmatchedProduct.marketplace,
                marketplace_product_id: unmatchedProduct.marketplace_product_id,
                marketplace_sku: unmatchedProduct.sku,
                barcode: unmatchedProduct.barcode,
                price: unmatchedProduct.price,
                stock_quantity: unmatchedProduct.stock,
                status: unmatchedProduct.status || "active",
                is_active: true,
                custom_title: unmatchedProduct.name,
                custom_description: unmatchedProduct.description,
                last_sync_date: new Date(),
                sync_status: "success",
              },
              { transaction }
            );

            results.savedProducts++;
            results.productDetails.push({
              productId: product.id,
              name: product.name,
              platforms: [unmatchedProduct.marketplace],
              confidence: 1.0,
              matchCriteria: ["single_platform"],
            });
          } catch (error) {
            logger.error(
              `Error saving unmatched product: ${error.message}`,
              error
            );
            results.errors.push({
              productGroup: unmatchedProduct.name,
              error: error.message,
            });
          }
        }
      }

      await transaction.commit();
      logger.info(
        `Product save completed: ${results.savedProducts} saved, ${results.skippedProducts} skipped, ${results.errors.length} errors`
      );
    } catch (error) {
      await transaction.rollback();
      logger.error(`Product save transaction failed: ${error.message}`, error);
      throw error;
    }

    return results;
  }

  /**
   * Eşleştirme özeti oluştur
   */
  generateMatchingSummary(matchingResults, platformCounts) {
    const totalProducts = Object.values(platformCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const matchedProducts = matchingResults.totalMatched || 0;
    const unmatchedProducts = totalProducts - matchedProducts;

    return {
      totalProducts,
      matchedProducts,
      unmatchedProducts,
      productGroups: matchingResults.productGroups?.length || 0,
      averageGroupSize:
        matchingResults.productGroups?.length > 0
          ? (matchedProducts / matchingResults.productGroups.length).toFixed(1)
          : 0,
      matchRate:
        totalProducts > 0
          ? ((matchedProducts / totalProducts) * 100).toFixed(1)
          : 0,
      platformBreakdown: platformCounts,
      recommendations: this.generateRecommendations(
        matchingResults,
        platformCounts
      ),
    };
  }

  /**
   * Öneriler oluştur
   */
  generateRecommendations(matchingResults, platformCounts) {
    const recommendations = [];

    if (matchingResults.productGroups?.length > 0) {
      recommendations.push({
        type: "save_matched_products",
        priority: "high",
        message: `${matchingResults.productGroups.length} ürün grubu bulundu - veritabanına kaydedin`,
        action: "POST /api/v1/products/match-platforms/save",
      });
    }

    const unmatchedCount = Object.values(
      matchingResults.unmatchedProducts || {}
    ).reduce((sum, products) => sum + products.length, 0);

    if (unmatchedCount > 0) {
      recommendations.push({
        type: "review_unmatched",
        priority: "medium",
        message: `${unmatchedCount} ürün eşleştirilemedi - manuel kontrol gerekebilir`,
        action: "Review unmatched products list",
      });
    }

    const lowMatchPlatforms = Object.entries(platformCounts)
      .filter(([, count]) => count < 10)
      .map(([platform]) => platform);

    if (lowMatchPlatforms.length > 0) {
      recommendations.push({
        type: "check_platform_connections",
        priority: "low",
        message: `${lowMatchPlatforms.join(", ")} platformlarında az ürün bulundu - bağlantıları kontrol edin`,
        action: "Check marketplace credentials",
      });
    }

    return recommendations;
  }

  /**
   * Desteklenen marketplace'leri al
   */
  getSupportedMarketplaces() {
    return this.supportedMarketplaces;
  }
}

module.exports = MultiPlatformProductMatcher;
