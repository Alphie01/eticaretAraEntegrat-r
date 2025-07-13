const logger = require('../utils/logger');

/**
 * Cross-platform ürün eşleştirme sistemi
 * Farklı marketplace'lerdeki ürünleri eşleştirir
 */
class ProductMatcher {
  constructor() {
    this.matchingCriteria = [
      'exact_sku',      // Tam SKU eşleşmesi (en güvenilir)
      'barcode',        // Barcode eşleşmesi
      'brand_name',     // Marka + isim eşleşmesi
      'name_similarity' // İsim benzerliği (fuzzy matching)
    ];
  }

  /**
   * İki marketplace arasındaki ürünleri eşleştir
   */
  async matchProducts(sourceProducts, targetProducts, options = {}) {
    const {
      strictMatching = false,
      similarityThreshold = 0.85,
      ignoreBrand = false
    } = options;

    const results = {
      matches: [],          // Eşleşen ürünler
      sourceOnly: [],       // Sadece kaynakta olan ürünler
      targetOnly: [],       // Sadece hedefte olan ürünler
      conflicts: [],        // Çakışan ürünler (farklı data)
      duplicates: []        // Duplicate ürünler
    };

    // Normalize edilmiş target ürünleri haritası
    const targetMap = this.createProductMap(targetProducts);
    const matchedTargetIds = new Set();

    logger.info(`Starting product matching: ${sourceProducts.length} source, ${targetProducts.length} target products`);

    // Her source ürün için eşleştirme yap
    for (const sourceProduct of sourceProducts) {
      const matches = this.findMatches(sourceProduct, targetMap, {
        strictMatching,
        similarityThreshold,
        ignoreBrand
      });

      if (matches.length === 0) {
        // Eşleşme bulunamadı - sadece kaynakta var
        results.sourceOnly.push({
          product: sourceProduct,
          reason: 'no_match_found'
        });
      } else if (matches.length === 1) {
        // Tek eşleşme bulundu
        const match = matches[0];
        matchedTargetIds.add(match.target.id || match.target.marketplace_product_id || match.target.sku);
        
        // Data conflict kontrolü
        const conflict = this.detectDataConflicts(sourceProduct, match.target);
        if (conflict.hasConflicts) {
          results.conflicts.push({
            source: sourceProduct,
            target: match.target,
            matchCriteria: match.criteria,
            confidence: match.confidence,
            conflicts: conflict.conflicts
          });
        } else {
          results.matches.push({
            source: sourceProduct,
            target: match.target,
            matchCriteria: match.criteria,
            confidence: match.confidence
          });
        }
      } else {
        // Birden fazla eşleşme - duplicate olabilir
        results.duplicates.push({
          source: sourceProduct,
          targets: matches,
          reason: 'multiple_matches'
        });
        
        // En yüksek confidence'a sahip olanı işaretle
        const bestMatch = matches.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        matchedTargetIds.add(bestMatch.target.id || bestMatch.target.marketplace_product_id || bestMatch.target.sku);
      }
    }

    // Sadece hedefte olan ürünleri bul
    for (const targetProduct of targetProducts) {
      const targetId = targetProduct.id || targetProduct.marketplace_product_id || targetProduct.sku;
      if (!matchedTargetIds.has(targetId)) {
        results.targetOnly.push({
          product: targetProduct,
          reason: 'no_match_found'
        });
      }
    }

    logger.info(`Product matching completed:`, {
      matches: results.matches.length,
      sourceOnly: results.sourceOnly.length,
      targetOnly: results.targetOnly.length,
      conflicts: results.conflicts.length,
      duplicates: results.duplicates.length
    });

    return results;
  }

  /**
   * Ürün haritası oluştur (hızlı arama için)
   */
  createProductMap(products) {
    const map = {
      bySku: new Map(),
      byBarcode: new Map(),
      byBrandName: new Map(),
      all: products
    };

    for (const product of products) {
      // SKU mapping
      if (product.sku) {
        map.bySku.set(this.normalizeSku(product.sku), product);
      }

      // Barcode mapping  
      if (product.barcode) {
        map.byBarcode.set(product.barcode, product);
      }

      // Brand + Name mapping
      if (product.brand && product.name) {
        const key = this.normalizeBrandName(product.brand, product.name);
        if (!map.byBrandName.has(key)) {
          map.byBrandName.set(key, []);
        }
        map.byBrandName.get(key).push(product);
      }
    }

    return map;
  }

  /**
   * Bir ürün için eşleştirme bul
   */
  findMatches(sourceProduct, targetMap, options) {
    const matches = [];

    // 1. Exact SKU match (en güvenilir)
    if (sourceProduct.sku) {
      const normalizedSku = this.normalizeSku(sourceProduct.sku);
      const exactMatch = targetMap.bySku.get(normalizedSku);
      if (exactMatch) {
        matches.push({
          target: exactMatch,
          criteria: 'exact_sku',
          confidence: 1.0
        });
        return matches;
      }
    }

    // 2. Barcode match
    if (sourceProduct.barcode) {
      const barcodeMatch = targetMap.byBarcode.get(sourceProduct.barcode);
      if (barcodeMatch) {
        matches.push({
          target: barcodeMatch,
          criteria: 'barcode',
          confidence: 0.95
        });
        return matches;
      }
    }

    // 3. Brand + Name exact match
    if (sourceProduct.brand && sourceProduct.name && !options.ignoreBrand) {
      const brandNameKey = this.normalizeBrandName(sourceProduct.brand, sourceProduct.name);
      const brandNameMatches = targetMap.byBrandName.get(brandNameKey);
      if (brandNameMatches && brandNameMatches.length > 0) {
        for (const match of brandNameMatches) {
          matches.push({
            target: match,
            criteria: 'brand_name',
            confidence: 0.90
          });
        }
        if (!options.strictMatching && matches.length > 0) {
          return matches;
        }
      }
    }

    // 4. Fuzzy name matching (en az güvenilir)
    if (!options.strictMatching && sourceProduct.name) {
      for (const targetProduct of targetMap.all) {
        if (targetProduct.name) {
          const similarity = this.calculateSimilarity(sourceProduct.name, targetProduct.name);
          if (similarity >= options.similarityThreshold) {
            let brandMatch = true;
            if (sourceProduct.brand && targetProduct.brand && !options.ignoreBrand) {
              brandMatch = this.normalizeBrand(sourceProduct.brand) === 
                          this.normalizeBrand(targetProduct.brand);
            }

            if (brandMatch) {
              matches.push({
                target: targetProduct,
                criteria: 'name_similarity',
                confidence: similarity * (brandMatch && sourceProduct.brand ? 1.0 : 0.8)
              });
            }
          }
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Data conflict detection
   */
  detectDataConflicts(sourceProduct, targetProduct) {
    const conflicts = [];

    // Fiyat karşılaştırması
    if (sourceProduct.price && targetProduct.price) {
      const priceDiff = Math.abs(sourceProduct.price - targetProduct.price);
      const priceThreshold = Math.max(sourceProduct.price, targetProduct.price) * 0.1;
      
      if (priceDiff > priceThreshold) {
        conflicts.push({
          field: 'price',
          source: sourceProduct.price,
          target: targetProduct.price,
          difference: priceDiff,
          severity: 'medium'
        });
      }
    }

    // Stok karşılaştırması
    if (sourceProduct.stock !== undefined && targetProduct.stock !== undefined) {
      const stockDiff = Math.abs(sourceProduct.stock - targetProduct.stock);
      if (stockDiff > 5) {
        conflicts.push({
          field: 'stock',
          source: sourceProduct.stock,
          target: targetProduct.stock,
          difference: stockDiff,
          severity: 'low'
        });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      severityScore: this.calculateSeverityScore(conflicts)
    };
  }

  /**
   * String similarity calculation
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);
    
    if (s1 === s2) return 1;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Normalization methods
   */
  normalizeSku(sku) {
    return sku?.toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  }

  normalizeBrand(brand) {
    return brand?.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  normalizeBrandName(brand, name) {
    const normalizedBrand = this.normalizeBrand(brand);
    const normalizedName = this.normalizeString(name);
    return `${normalizedBrand}|${normalizedName}`;
  }

  normalizeString(str) {
    return str?.toString().toLowerCase().trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  calculateSeverityScore(conflicts) {
    return conflicts.reduce((score, conflict) => {
      switch (conflict.severity) {
        case 'high': return score + 3;
        case 'medium': return score + 2;
        case 'low': return score + 1;
        default: return score;
      }
    }, 0);
  }

  /**
   * Eşleştirme sonuçlarını özetle
   */
  generateMatchingSummary(results) {
    const total = results.matches.length + results.sourceOnly.length + 
                 results.targetOnly.length + results.conflicts.length + 
                 results.duplicates.length;

    return {
      total,
      matched: results.matches.length,
      sourceOnly: results.sourceOnly.length,
      targetOnly: results.targetOnly.length,
      conflicts: results.conflicts.length,
      duplicates: results.duplicates.length,
      matchRate: total > 0 ? (results.matches.length / total * 100).toFixed(1) : 0,
      recommendations: this.generateRecommendations(results)
    };
  }

  /**
   * Aksiyon önerileri oluştur
   */
  generateRecommendations(results) {
    const recommendations = [];

    if (results.sourceOnly.length > 0) {
      recommendations.push({
        type: 'sync_to_target',
        count: results.sourceOnly.length,
        message: `${results.sourceOnly.length} ürün hedef marketplace'de eksik - sync edilebilir`
      });
    }

    if (results.targetOnly.length > 0) {
      recommendations.push({
        type: 'sync_to_source',
        count: results.targetOnly.length,
        message: `${results.targetOnly.length} ürün kaynak marketplace'de eksik - import edilebilir`
      });
    }

    if (results.conflicts.length > 0) {
      const highPriorityConflicts = results.conflicts.filter(c => 
        c.conflicts.some(conf => conf.severity === 'high' || conf.severity === 'medium')
      );

      if (highPriorityConflicts.length > 0) {
        recommendations.push({
          type: 'resolve_conflicts',
          count: highPriorityConflicts.length,
          message: `${highPriorityConflicts.length} ürün data conflict'i var - manuel kontrol gerekli`
        });
      }
    }

    if (results.duplicates.length > 0) {
      recommendations.push({
        type: 'handle_duplicates',
        count: results.duplicates.length,
        message: `${results.duplicates.length} ürün duplicate olabilir - kontrol edilmeli`
      });
    }

    return recommendations;
  }
}

module.exports = ProductMatcher; 