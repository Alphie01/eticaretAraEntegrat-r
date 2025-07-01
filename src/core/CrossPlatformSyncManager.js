const ProductMatcher = require('./ProductMatcher');
const adapterManager = require('./AdapterManager');
const logger = require('../utils/logger');
const { Product, ProductMarketplace } = require('../models');
const { Op } = require('sequelize');

/**
 * Cross-platform ürün senkronizasyon yöneticisi
 * Farklı marketplace'ler arasında ürün eşleştirmesi ve sync yapısını yönetir
 */
class CrossPlatformSyncManager {
  constructor() {
    this.productMatcher = new ProductMatcher();
    this.supportedMarketplaces = ['trendyol', 'hepsiburada', 'amazon', 'n11', 'shopify', 'ciceksepeti', 'pazarama', 'pttavm'];
  }

  /**
   * İki marketplace arasında ürün analizi ve eşleştirme
   * @param {number} userId - Kullanıcı ID
   * @param {string} sourceMarketplace - Kaynak marketplace
   * @param {string} targetMarketplace - Hedef marketplace
   * @param {Object} options - Analiz seçenekleri
   */
  async analyzeProductsAcrossMarketplaces(userId, sourceMarketplace, targetMarketplace, options = {}) {
    try {
      logger.info(`Starting cross-platform product analysis: ${sourceMarketplace} -> ${targetMarketplace} for user ${userId}`);

      // Her iki marketplace'den de ürünleri al
      const [sourceProducts, targetProducts] = await Promise.all([
        this.getMarketplaceProducts(userId, sourceMarketplace),
        this.getMarketplaceProducts(userId, targetMarketplace)
      ]);

      logger.info(`Retrieved products: ${sourceProducts.length} from ${sourceMarketplace}, ${targetProducts.length} from ${targetMarketplace}`);

      // Ürünleri eşleştir
      const matchingResults = await this.productMatcher.matchProducts(
        sourceProducts,
        targetProducts,
        {
          strictMatching: options.strictMatching || false,
          similarityThreshold: options.similarityThreshold || 0.85,
          ignoreBrand: options.ignoreBrand || false
        }
      );

      // Özet rapor oluştur
      const summary = this.productMatcher.generateMatchingSummary(matchingResults);

      // Sync önerileri oluştur
      const syncRecommendations = await this.generateSyncRecommendations(
        userId,
        sourceMarketplace,
        targetMarketplace,
        matchingResults
      );

      const result = {
        analysis: {
          sourceMarketplace,
          targetMarketplace,
          timestamp: new Date(),
          sourceProductCount: sourceProducts.length,
          targetProductCount: targetProducts.length
        },
        matching: matchingResults,
        summary,
        syncRecommendations,
        nextSteps: this.generateNextSteps(matchingResults, summary)
      };

      logger.info(`Cross-platform analysis completed:`, {
        matches: summary.matched,
        sourceOnly: summary.sourceOnly,
        targetOnly: summary.targetOnly,
        conflicts: summary.conflicts
      });

      return result;

    } catch (error) {
      logger.error(`Cross-platform analysis failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Marketplace'den ürün verilerini al ve normalize et
   */
  async getMarketplaceProducts(userId, marketplace) {
    try {
      const adapter = await adapterManager.getAdapter(userId, marketplace);
      
      // Marketplace'den ürünleri al
      const productsResponse = await adapter.getProducts({ 
        limit: 1000, // Büyük batch
        page: 0 
      });

      const products = productsResponse.products || [];

      // Normalize et
      return products.map(product => this.normalizeProductData(product, marketplace));

    } catch (error) {
      logger.error(`Failed to get products from ${marketplace}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ürün verilerini standart formata normalize et
   */
  normalizeProductData(product, marketplace) {
    const normalized = {
      marketplace,
      originalData: product
    };

    // Marketplace'e göre farklı field mapping
    switch (marketplace) {
      case 'trendyol':
        normalized.id = product.id;
        normalized.sku = product.productMainId || product.barcode;
        normalized.barcode = product.barcode;
        normalized.name = product.title;
        normalized.brand = product.brand;
        normalized.price = product.salePrice;
        normalized.stock = product.quantity || 0;
        normalized.description = product.description;
        normalized.images = product.images || [];
        normalized.category = product.category;
        normalized.status = product.approved ? 'active' : 'pending';
        break;

      case 'hepsiburada':
        normalized.id = product.listingId || product.merchantSku;
        normalized.sku = product.merchantSku;
        normalized.barcode = product.barcode;
        normalized.name = product.title;
        normalized.brand = product.brand;
        normalized.price = product.price;
        normalized.stock = product.availableStock || 0;
        normalized.description = product.description;
        normalized.images = product.images || [];
        normalized.category = product.categoryId;
        normalized.status = product.status || 'active';
        break;

      case 'amazon':
        normalized.id = product.asin || product.sku;
        normalized.sku = product.sku;
        normalized.barcode = product.upc || product.ean;
        normalized.name = product.title;
        normalized.brand = product.brand;
        normalized.price = product.price;
        normalized.stock = product.quantity || 0;
        normalized.description = product.description;
        normalized.images = product.images || [];
        normalized.category = product.productType;
        normalized.status = product.status;
        break;

      case 'n11':
        normalized.id = product.id || product.productId;
        normalized.sku = product.sellerStockCode || product.sku;
        normalized.barcode = product.gtin || product.barcode;
        normalized.name = product.title;
        normalized.brand = product.brand;
        normalized.price = product.price;
        normalized.stock = product.quantity || 0;
        normalized.description = product.description;
        normalized.images = product.images || [];
        normalized.category = product.categoryId;
        normalized.status = product.status;
        break;

      case 'shopify':
        // Shopify uses first variant for main product data
        const firstVariant = product.variants?.[0] || {};
        normalized.id = product.id;
        normalized.sku = firstVariant.sku || product.sku;
        normalized.barcode = firstVariant.barcode || product.barcode;
        normalized.name = product.title;
        normalized.brand = product.vendor;
        normalized.price = parseFloat(firstVariant.price) || 0;
        normalized.stock = firstVariant.inventory_quantity || 0;
        normalized.description = product.body_html?.replace(/<[^>]*>/g, '') || ''; // Strip HTML
        normalized.images = product.images?.map(img => img.src) || [];
        normalized.category = product.product_type;
        normalized.status = product.status;
        break;

      case 'ciceksepeti':
        normalized.id = product.id;
        normalized.sku = product.sku;
        normalized.barcode = product.barcode;
        normalized.name = product.name;
        normalized.brand = product.brand;
        normalized.price = product.price || 0;
        normalized.stock = product.stock || 0;
        normalized.description = product.description;
        normalized.images = product.images?.map(img => img.url || img) || [];
        normalized.category = product.categoryId || product.category;
        normalized.status = product.status;
        // ÇiçekSepeti specific fields
        normalized.deliveryType = product.deliveryType;
        normalized.isPerishable = product.isPerishable;
        normalized.shelfLife = product.shelfLife;
        normalized.occasionIds = product.occasionIds;
        break;

      case 'pazarama':
        normalized.id = product.id;
        normalized.sku = product.code || product.sku;
        normalized.barcode = product.code || product.barcode;
        normalized.name = product.name || product.displayName;
        normalized.brand = product.brandId || product.brand;
        normalized.price = product.salePrice || product.listPrice || product.price || 0;
        normalized.stock = product.stockCount || product.stock || 0;
        normalized.description = product.description;
        normalized.images = product.images?.map(img => img.imageUrl || img.url || img) || [];
        normalized.category = product.categoryId || product.category;
        normalized.status = product.isActive ? 'active' : 'inactive';
        // Pazarama specific fields
        normalized.listPrice = product.listPrice;
        normalized.vatRate = product.vatRate;
        normalized.desi = product.desi;
        normalized.groupCode = product.groupCode;
        break;

      case 'pttavm':
        normalized.id = product.id || product.productId;
        normalized.sku = product.barcode || product.modelCode || product.sku;
        normalized.barcode = product.barcode;
        normalized.name = product.name;
        normalized.brand = product.brandId || product.brand;
        normalized.price = product.price || product.listPrice || 0;
        normalized.stock = product.stock || 0;
        normalized.description = product.description;
        normalized.images = product.images?.map(img => img.url || img) || [];
        normalized.category = product.categoryId || product.category;
        normalized.status = product.isActive ? 'active' : 'inactive';
        // PTT AVM specific fields
        normalized.listPrice = product.listPrice;
        normalized.modelCode = product.modelCode;
        normalized.weight = product.weight;
        normalized.currency = product.currency;
        break;

      default:
        // Generic mapping
        normalized.id = product.id || product.sku;
        normalized.sku = product.sku;
        normalized.barcode = product.barcode;
        normalized.name = product.name || product.title;
        normalized.brand = product.brand;
        normalized.price = product.price;
        normalized.stock = product.stock || product.quantity || 0;
        normalized.description = product.description;
        normalized.images = product.images || [];
        normalized.category = product.category;
        normalized.status = product.status;
    }

    return normalized;
  }

  /**
   * Sync önerilerini oluştur
   */
  async generateSyncRecommendations(userId, sourceMarketplace, targetMarketplace, matchingResults) {
    const recommendations = [];

    // Sadece kaynakta olan ürünleri hedef marketplace'e sync et
    if (matchingResults.sourceOnly.length > 0) {
      recommendations.push({
        type: 'sync_missing_products',
        direction: `${sourceMarketplace} -> ${targetMarketplace}`,
        count: matchingResults.sourceOnly.length,
        products: matchingResults.sourceOnly.map(item => ({
          sourceProduct: item.product,
          action: 'create_in_target',
          priority: 'high',
          estimatedTime: '5-10 minutes'
        })),
        description: `${matchingResults.sourceOnly.length} ürün ${targetMarketplace}'de eksik ve sync edilebilir`
      });
    }

    // Sadece hedefte olan ürünleri kaynak marketplace'e sync et (ters yön)
    if (matchingResults.targetOnly.length > 0) {
      recommendations.push({
        type: 'import_missing_products',
        direction: `${targetMarketplace} -> ${sourceMarketplace}`,
        count: matchingResults.targetOnly.length,
        products: matchingResults.targetOnly.map(item => ({
          targetProduct: item.product,
          action: 'import_to_source',
          priority: 'medium',
          estimatedTime: '5-10 minutes'
        })),
        description: `${matchingResults.targetOnly.length} ürün ${sourceMarketplace}'de eksik ve import edilebilir`
      });
    }

    // Conflict'ları çöz
    if (matchingResults.conflicts.length > 0) {
      recommendations.push({
        type: 'resolve_conflicts',
        count: matchingResults.conflicts.length,
        conflicts: matchingResults.conflicts.map(conflict => ({
          sourceProduct: conflict.source,
          targetProduct: conflict.target,
          conflicts: conflict.conflicts,
          action: 'manual_review_required',
          priority: this.getConflictPriority(conflict.conflicts),
          suggestions: this.generateConflictSuggestions(conflict)
        })),
        description: `${matchingResults.conflicts.length} ürün arasında data conflict var, manuel kontrol gerekli`
      });
    }

    return recommendations;
  }

  /**
   * Conflict önceliği belirle
   */
  getConflictPriority(conflicts) {
    const hasHighSeverity = conflicts.some(c => c.severity === 'high');
    const hasMediumSeverity = conflicts.some(c => c.severity === 'medium');
    
    if (hasHighSeverity) return 'high';
    if (hasMediumSeverity) return 'medium';
    return 'low';
  }

  /**
   * Conflict çözüm önerileri
   */
  generateConflictSuggestions(conflict) {
    const suggestions = [];

    for (const dataConflict of conflict.conflicts) {
      switch (dataConflict.field) {
        case 'price':
          if (dataConflict.source > dataConflict.target) {
            suggestions.push({
              field: 'price',
              suggestion: 'use_lower_price',
              message: `Düşük fiyatı kullan (${dataConflict.target} TL) - daha rekabetçi`
            });
          } else {
            suggestions.push({
              field: 'price',
              suggestion: 'use_higher_price', 
              message: `Yüksek fiyatı kullan (${dataConflict.source} TL) - daha karlı`
            });
          }
          break;

        case 'stock':
          suggestions.push({
            field: 'stock',
            suggestion: 'use_max_stock',
            message: `En yüksek stok değerini kullan (${Math.max(dataConflict.source, dataConflict.target)})`
          });
          break;

        default:
          suggestions.push({
            field: dataConflict.field,
            suggestion: 'manual_review',
            message: `${dataConflict.field} alanı manuel kontrol gerektirir`
          });
      }
    }

    return suggestions;
  }

  /**
   * Sonraki adım önerilerini oluştur
   */
  generateNextSteps(matchingResults, summary) {
    const steps = [];

    if (summary.sourceOnly > 0) {
      steps.push({
        step: 1,
        action: 'sync_missing_products',
        description: `${summary.sourceOnly} eksik ürünü sync edin`,
        endpoint: 'POST /api/v1/sync/cross-platform/execute',
        estimated_time: `${summary.sourceOnly * 2} dakika`
      });
    }

    if (summary.conflicts > 0) {
      steps.push({
        step: steps.length + 1,
        action: 'review_conflicts',
        description: `${summary.conflicts} conflict'ı inceleyin ve çözün`,
        endpoint: 'GET /api/v1/sync/cross-platform/conflicts',
        estimated_time: `${summary.conflicts * 5} dakika`
      });
    }

    if (summary.targetOnly > 0) {
      steps.push({
        step: steps.length + 1,
        action: 'import_products',
        description: `${summary.targetOnly} ürünü import edin (opsiyonel)`,
        endpoint: 'POST /api/v1/sync/cross-platform/import',
        estimated_time: `${summary.targetOnly * 2} dakika`
      });
    }

    if (steps.length === 0) {
      steps.push({
        step: 1,
        action: 'monitoring',
        description: 'Tüm ürünler sync durumda! Düzenli monitoring yapın',
        endpoint: 'GET /api/v1/sync/cross-platform/status',
        estimated_time: '1 dakika'
      });
    }

    return steps;
  }

  /**
   * Cross-platform sync işlemini gerçekleştir
   */
  async executeCrossPlatformSync(userId, sourceMarketplace, targetMarketplace, options = {}) {
    try {
      logger.info(`Starting cross-platform sync execution: ${sourceMarketplace} -> ${targetMarketplace}`);

      // Önce analiz yap
      const analysis = await this.analyzeProductsAcrossMarketplaces(
        userId, 
        sourceMarketplace, 
        targetMarketplace, 
        options
      );

      const results = {
        analysis,
        sync: {
          started: new Date(),
          completed: null,
          results: []
        }
      };

      // Sync önerilerini uygula
      for (const recommendation of analysis.syncRecommendations) {
        if (recommendation.type === 'sync_missing_products' && options.syncMissing !== false) {
          const syncResult = await this.syncMissingProducts(
            userId,
            recommendation,
            sourceMarketplace,
            targetMarketplace
          );
          results.sync.results.push(syncResult);
        }

        if (recommendation.type === 'import_missing_products' && options.importMissing === true) {
          const importResult = await this.importMissingProducts(
            userId,
            recommendation,
            targetMarketplace,
            sourceMarketplace
          );
          results.sync.results.push(importResult);
        }
      }

      results.sync.completed = new Date();
      results.sync.duration = results.sync.completed - results.sync.started;

      logger.info(`Cross-platform sync completed in ${results.sync.duration}ms`);
      return results;

    } catch (error) {
      logger.error(`Cross-platform sync execution failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Eksik ürünleri sync et
   */
  async syncMissingProducts(userId, recommendation, sourceMarketplace, targetMarketplace) {
    const results = {
      type: 'sync_missing_products',
      total: recommendation.count,
      successful: 0,
      failed: 0,
      details: []
    };

    try {
      const targetAdapter = await adapterManager.getAdapter(userId, targetMarketplace);

      for (const productInfo of recommendation.products) {
        const sourceProduct = productInfo.sourceProduct;
        
        try {
          // Ürünü hedef marketplace formatına dönüştür
          const transformedProduct = this.transformProductForMarketplace(
            sourceProduct, 
            targetMarketplace
          );

          // Hedef marketplace'de ürünü oluştur
          const createResult = await targetAdapter.createProduct(transformedProduct);

          results.successful++;
          results.details.push({
            sourceProduct: sourceProduct.name,
            sourceSku: sourceProduct.sku,
            targetProductId: createResult.productId || createResult.data?.id,
            status: 'success',
            message: 'Ürün başarıyla oluşturuldu'
          });

          logger.debug(`Product synced successfully: ${sourceProduct.name} -> ${targetMarketplace}`);

        } catch (error) {
          results.failed++;
          results.details.push({
            sourceProduct: sourceProduct.name,
            sourceSku: sourceProduct.sku,
            status: 'failed',
            error: error.message,
            message: 'Ürün sync edilemedi'
          });

          logger.error(`Product sync failed: ${sourceProduct.name}`, error);
        }
      }

    } catch (error) {
      logger.error(`Sync missing products failed: ${error.message}`, error);
      throw error;
    }

    return results;
  }

  /**
   * Ürünü marketplace formatına dönüştür
   */
  transformProductForMarketplace(product, targetMarketplace) {
    const baseTransform = {
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      brand: product.brand,
      images: product.images,
      sku: product.sku
    };

    // Marketplace'e özel dönüşümler
    switch (targetMarketplace) {
      case 'trendyol':
        return {
          title: baseTransform.name,
          description: baseTransform.description,
          salePrice: baseTransform.price,
          listPrice: baseTransform.price * 1.2, // %20 markup
          quantity: baseTransform.stock,
          brand: baseTransform.brand,
          images: baseTransform.images.map(img => ({ url: img.url || img })),
          productMainId: baseTransform.sku
        };

      case 'hepsiburada':
        return {
          title: baseTransform.name,
          description: baseTransform.description,
          price: baseTransform.price,
          availableStock: baseTransform.stock,
          brand: baseTransform.brand,
          images: baseTransform.images.map(img => img.url || img),
          merchantSku: baseTransform.sku
        };

      case 'amazon':
        return {
          sku: baseTransform.sku,
          name: baseTransform.name,
          description: baseTransform.description,
          brand: baseTransform.brand,
          price: baseTransform.price,
          stock: baseTransform.stock,
          images: baseTransform.images.map(img => img.url || img),
          features: baseTransform.description ? [baseTransform.description] : []
        };

      case 'n11':
        return {
          title: baseTransform.name,
          description: baseTransform.description,
          price: baseTransform.price,
          currencyType: 'TL',
          images: baseTransform.images.map((img, index) => ({
            url: img.url || img,
            order: index + 1
          })),
          stockItems: [{
            bundle: false,
            sellerStockCode: baseTransform.sku,
            gtin: baseTransform.barcode || '',
            quantity: baseTransform.stock
          }]
        };

      case 'shopify':
        return {
          title: baseTransform.name,
          body_html: baseTransform.description,
          vendor: baseTransform.brand,
          product_type: baseTransform.category,
          published: true,
          status: 'active',
          images: baseTransform.images.map((img, index) => ({
            src: img.url || img,
            position: index + 1
          })),
          variants: [{
            price: baseTransform.price.toString(),
            sku: baseTransform.sku,
            barcode: baseTransform.barcode || '',
            inventory_quantity: baseTransform.stock,
            inventory_management: 'shopify',
            inventory_policy: 'deny'
          }]
        };

      case 'ciceksepeti':
        return {
          name: baseTransform.name,
          description: baseTransform.description,
          categoryId: baseTransform.category,
          price: baseTransform.price,
          currency: 'TRY',
          stock: baseTransform.stock,
          stockStatus: baseTransform.stock > 0 ? 'in_stock' : 'out_of_stock',
          status: 'active',
          sku: baseTransform.sku,
          barcode: baseTransform.barcode || '',
          brand: baseTransform.brand,
          images: baseTransform.images.map((img, index) => ({
            url: img.url || img,
            order: index + 1,
            isMain: index === 0
          })),
          isPerishable: true, // Default for ÇiçekSepeti
          shelfLife: 7, // Default 7 days
          deliveryType: 'same_day' // Default delivery type
        };

      case 'pazarama':
        return {
          name: baseTransform.name,
          displayName: baseTransform.name,
          description: baseTransform.description,
          brandId: baseTransform.brand,
          categoryId: baseTransform.category,
          desi: 1, // Default desi value
          code: baseTransform.sku || baseTransform.barcode,
          groupCode: baseTransform.sku || baseTransform.barcode,
          stockCount: baseTransform.stock,
          vatRate: 18, // Default Turkish VAT
          listPrice: baseTransform.price,
          salePrice: baseTransform.price,
          images: baseTransform.images.map((img, index) => ({
            imageUrl: img.url || img,
            order: index + 1
          })),
          attributes: [], // Default empty attributes
          isActive: true,
          approved: false // Default requires approval
        };

      case 'pttavm':
        return {
          name: baseTransform.name,
          description: baseTransform.description,
          categoryId: baseTransform.category,
          brandId: baseTransform.brand,
          barcode: baseTransform.barcode || baseTransform.sku,
          modelCode: baseTransform.sku,
          price: baseTransform.price,
          listPrice: baseTransform.price,
          stock: baseTransform.stock,
          currency: 'TRY',
          images: baseTransform.images.map((img, index) => ({
            url: img.url || img,
            order: index + 1,
            isMain: index === 0
          })),
          attributes: [], // Default empty attributes
          isActive: true,
          status: 'active'
        };

      default:
        return baseTransform;
    }
  }

  /**
   * Eksik ürünleri import et (ters yön)
   */
  async importMissingProducts(userId, recommendation, sourceMarketplace, targetMarketplace) {
    // syncMissingProducts ile aynı mantık ama ters yön
    return await this.syncMissingProducts(
      userId,
      {
        ...recommendation,
        products: recommendation.products.map(p => ({
          sourceProduct: p.targetProduct, // Ters çevir
          action: 'import_to_source'
        }))
      },
      targetMarketplace, // Source olarak kullan
      sourceMarketplace  // Target olarak kullan
    );
  }

  /**
   * Desteklenen marketplace'leri al
   */
  getSupportedMarketplaces() {
    return this.supportedMarketplaces;
  }

  /**
   * Sync durumunu kontrol et
   */
  async getCrossPlatformSyncStatus(userId, marketplaceA, marketplaceB) {
    try {
      // Quick analiz yap (sadece counts)
      const [productsA, productsB] = await Promise.all([
        this.getMarketplaceProducts(userId, marketplaceA),
        this.getMarketplaceProducts(userId, marketplaceB)
      ]);

      const quickAnalysis = await this.productMatcher.matchProducts(
        productsA.slice(0, 100), // İlk 100 ürün ile hızlı test
        productsB.slice(0, 100),
        { strictMatching: true }
      );

      const summary = this.productMatcher.generateMatchingSummary(quickAnalysis);

      return {
        marketplaceA: {
          name: marketplaceA,
          productCount: productsA.length
        },
        marketplaceB: {
          name: marketplaceB,
          productCount: productsB.length
        },
        syncStatus: {
          estimatedMatchRate: summary.matchRate,
          needsSync: summary.sourceOnly > 0 || summary.targetOnly > 0,
          hasConflicts: summary.conflicts > 0,
          recommendations: summary.recommendations
        },
        lastChecked: new Date()
      };

    } catch (error) {
      logger.error(`Failed to get sync status: ${error.message}`, error);
      throw error;
    }
  }
}

module.exports = CrossPlatformSyncManager; 