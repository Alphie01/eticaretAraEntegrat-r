// Quick test script for marketplace validation
require('dotenv').config();
const { SUPPORTED_MARKETPLACES, isMarketplaceSupported } = require('./src/constants/marketplaces');
const Joi = require('joi');

console.log('=== MARKETPLACE VALIDATION TEST ===\n');

console.log('Supported marketplaces:', SUPPORTED_MARKETPLACES);
console.log('Total supported:', SUPPORTED_MARKETPLACES.length);

// Test validation schema
const testSchema = Joi.object({
  marketplace: Joi.string().valid(...SUPPORTED_MARKETPLACES).required(),
  api_key: Joi.string().required()
});

// Test cases
const testCases = [
  { marketplace: 'trendyol', api_key: 'test-key' },
  { marketplace: 'shopify', api_key: 'test-key' },
  { marketplace: 'gittigidiyor', api_key: 'test-key' },
  { marketplace: 'invalid-marketplace', api_key: 'test-key' },
  { marketplace: 'ebay', api_key: 'test-key' } // Should fail
];

console.log('\n=== VALIDATION TESTS ===');
testCases.forEach((testCase, index) => {
  const result = testSchema.validate(testCase);
  const isSupported = isMarketplaceSupported(testCase.marketplace);
  
  console.log(`\nTest ${index + 1}:`);
  console.log(`  Marketplace: ${testCase.marketplace}`);
  console.log(`  Is supported (function): ${isSupported}`);
  console.log(`  Joi validation: ${result.error ? 'FAILED' : 'PASSED'}`);
  if (result.error) {
    console.log(`  Error: ${result.error.message}`);
  }
});

console.log('\n=== TEST COMPLETED ===');
