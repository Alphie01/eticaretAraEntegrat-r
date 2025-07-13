// Environment variables'ları yükle
require('dotenv').config();

const { connectDB, getSequelize, closeDB } = require('../src/config/database');

async function syncDatabase() {
  try {
    console.log('Starting database sync...');
    
    // İlk önce database'e bağlan
    await connectDB();
    const sequelize = getSequelize();
    
    if (!sequelize) {
      throw new Error('Database connection failed');
    }
    
    // Force sync to ensure tables are created
    await sequelize.sync({ force: false, alter: true });
    
    console.log('Database sync completed successfully!');
    console.log('The following tables should now be available:');
    console.log('- product_variants');
    console.log('- product_images');
    console.log('- product_marketplaces');
    
    // Database bağlantısını kapat
    await closeDB();
    
  } catch (error) {
    console.error('Database sync failed:', error);
    process.exit(1);
  }
}

syncDatabase(); 