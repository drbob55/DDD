// check-db-structure.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDB() {
  try {
    // Get raw database info
    const result = await prisma.$queryRaw`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='User';
    `;
    
    console.log('User table structure:');
    console.log(result);
    
    // Try to get column info
    const columns = await prisma.$queryRaw`
      PRAGMA table_info(User);
    `;
    
    console.log('\nColumns in User table:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();