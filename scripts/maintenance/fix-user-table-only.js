// fix-user-table-only.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserTable() {
  try {
    // Check which columns are missing
    const columns = await prisma.$queryRaw`PRAGMA table_info(User);`;
    const columnNames = columns.map(col => col.name);
    
    console.log('Current columns:', columnNames);
    
    // Add missing columns one by one
    if (!columnNames.includes('profileCompleted')) {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN profileCompleted BOOLEAN DEFAULT 0;`;
      console.log('✅ Added profileCompleted');
    }
    
    if (!columnNames.includes('lastLoginAt')) {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN lastLoginAt DATETIME;`;
      console.log('✅ Added lastLoginAt');
    }
    
    if (!columnNames.includes('passwordChangedAt')) {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN passwordChangedAt DATETIME;`;
      console.log('✅ Added passwordChangedAt');
    }
    
    // Now reset a password for testing
    const bcryptjs = require('bcryptjs');
    const email = 'dentist1@admin.com';
    const newPassword = 'test123';
    const hashedPassword = await bcryptjs.hash(newPassword, 12);
    
    await prisma.$executeRaw`
      UPDATE User 
      SET password = ${hashedPassword}, profileCompleted = 1 
      WHERE email = ${email};
    `;
    
    console.log('\n✅ Password reset for:', email);
    console.log('   New password:', newPassword);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserTable();