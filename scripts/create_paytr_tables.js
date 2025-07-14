require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Database configuration from environment variables
const config = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    idleTimeoutMillis: 30000
  }
};

async function createPayTRTables() {
  let pool;
  
  try {
    console.log('🔗 Connecting to SQL Server...');
    console.log(`   Server: ${config.server}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    
    // Connect to SQL Server
    pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server successfully!');
    
    // Read the SQL script
    const sqlFilePath = path.join(__dirname, '..', 'sql', 'create_payment_tables.sql');
    console.log(`📄 Reading SQL script: ${sqlFilePath}`);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }
    
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ SQL script loaded successfully!');
    
    // Parse SQL script into individual statements
    // Split by semicolons but handle multi-line statements properly
    const lines = sqlScript.split('\n');
    const statements = [];
    let currentStatement = '';
    let inMultiLineStatement = false;
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comment-only lines
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue;
      }
      
      // Add line to current statement
      currentStatement += line + '\n';
      
      // Check if this line ends a statement
      if (trimmedLine.endsWith(';')) {
        // Clean up the statement
        const statement = currentStatement.trim();
        if (statement && statement.length > 10) {
          statements.push(statement);
        }
        currentStatement = '';
        inMultiLineStatement = false;
      } else {
        inMultiLineStatement = true;
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`🔧 Executing ${statements.length} SQL statements...`);
    console.log('');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and pure comments
      if (!statement || statement.length < 10) {
        continue;
      }
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing statement...`);
        
        // Log the beginning of each major statement
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          const tableMatch = statement.match(/CREATE TABLE\s+(\w+)/i);
          if (tableMatch) {
            console.log(`   📋 Creating table: ${tableMatch[1]}`);
          }
        } else if (statement.toUpperCase().includes('CREATE INDEX')) {
          const indexMatch = statement.match(/CREATE INDEX\s+(\w+)/i);
          if (indexMatch) {
            console.log(`   📚 Creating index: ${indexMatch[1]}`);
          }
        } else if (statement.toUpperCase().includes('CREATE VIEW')) {
          const viewMatch = statement.match(/CREATE VIEW\s+(\w+)/i);
          if (viewMatch) {
            console.log(`   👁️ Creating view: ${viewMatch[1]}`);
          }
        } else if (statement.toUpperCase().includes('CREATE OR ALTER TRIGGER')) {
          const triggerMatch = statement.match(/CREATE OR ALTER TRIGGER\s+(\w+)/i);
          if (triggerMatch) {
            console.log(`   ⚡ Creating trigger: ${triggerMatch[1]}`);
          }
        } else if (statement.toUpperCase().includes('DROP TABLE')) {
          const dropMatch = statement.match(/DROP TABLE\s+(\w+)/i);
          if (dropMatch) {
            console.log(`   🗑️ Dropping table: ${dropMatch[1]}`);
          }
        } else if (statement.toUpperCase().includes('PRINT')) {
          console.log(`   💬 Print statement`);
        }
        
        const result = await pool.request().query(statement);
        
        // Log any messages returned by SQL Server
        if (result.recordset && result.recordset.length > 0) {
          console.log(`   ✅ Statement executed successfully (${result.recordset.length} rows affected)`);
        } else if (result.rowsAffected && result.rowsAffected.length > 0) {
          const totalRows = result.rowsAffected.reduce((sum, rows) => sum + rows, 0);
          if (totalRows > 0) {
            console.log(`   ✅ Statement executed successfully (${totalRows} rows affected)`);
          } else {
            console.log(`   ✅ Statement executed successfully`);
          }
        } else {
          console.log(`   ✅ Statement executed successfully`);
        }
        
      } catch (statementError) {
        console.error(`   ❌ Error executing statement ${i + 1}:`);
        console.error(`   Error: ${statementError.message}`);
        
        // Show problematic statement (first 200 chars)
        const shortStatement = statement.length > 200 
          ? statement.substring(0, 200) + '...' 
          : statement;
        console.error(`   Statement: ${shortStatement}`);
        
        // Continue with next statement instead of stopping
        console.log(`   ⏭️ Continuing with next statement...`);
      }
    }
    
    console.log('');
    console.log('🎉 PayTR tables creation completed!');
    console.log('');
    
    // Verify tables were created
    console.log('🔍 Verifying created tables...');
    
    const tableCheckQueries = [
      "SELECT name FROM sys.tables WHERE name = 'payments'",
      "SELECT name FROM sys.tables WHERE name = 'paytr_transactions'",
      "SELECT name FROM sys.views WHERE name = 'vw_payment_summary'",
      "SELECT name FROM sys.views WHERE name = 'vw_payment_statistics'",
      "SELECT name FROM sys.triggers WHERE name = 'tr_payments_updated_at'",
      "SELECT name FROM sys.triggers WHERE name = 'tr_paytr_transactions_updated_at'"
    ];
    
    const objectNames = ['payments table', 'paytr_transactions table', 'vw_payment_summary view', 'vw_payment_statistics view', 'tr_payments_updated_at trigger', 'tr_paytr_transactions_updated_at trigger'];
    
    for (let i = 0; i < tableCheckQueries.length; i++) {
      try {
        const result = await pool.request().query(tableCheckQueries[i]);
        if (result.recordset.length > 0) {
          console.log(`   ✅ ${objectNames[i]} created successfully`);
        } else {
          console.log(`   ⚠️ ${objectNames[i]} not found`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking ${objectNames[i]}: ${error.message}`);
      }
    }
    
    console.log('');
    console.log('🚀 PayTR payment system is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add PayTR credentials to your .env file');
    console.log('2. Restart your application');
    console.log('3. Test payment creation endpoints');
    console.log('4. Configure PayTR webhook URL in PayTR panel');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error creating PayTR tables:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.originalError) {
      console.error('Original Error:', error.originalError.message);
    }
    
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Check your .env file database credentials');
    console.log('2. Ensure SQL Server is running and accessible');
    console.log('3. Verify the user has CREATE permissions');
    console.log('4. Check if the database exists');
    
    process.exit(1);
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('🔌 Database connection closed.');
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
}

// Check if this script is being run directly
if (require.main === module) {
  console.log('🎯 PayTR Database Tables Creator');
  console.log('================================');
  console.log('');
  
  createPayTRTables().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = createPayTRTables; 