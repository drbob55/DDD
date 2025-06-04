// migrate-data.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  try {
    console.log('Starting data migration...');
    
    // 1. First, let's see what we're working with
    const users = await prisma.user.findMany();
    const cases = await prisma.case.findMany();
    
    console.log(`Found ${users.length} users and ${cases.length} cases`);
    
    // 2. Add userId to existing users
    console.log('\nUpdating users with userId...');
    for (const user of users) {
      if (!user.userId) {
        const userId = Math.floor(10000000 + Math.random() * 90000000).toString();
        await prisma.$executeRaw`UPDATE User SET userId = ${userId}, updatedAt = datetime('now') WHERE id = ${user.id}`;
        console.log(`Updated user ${user.email} with userId: ${userId}`);
      }
    }
    
    // 3. Add caseNumber to existing cases
    console.log('\nUpdating cases with caseNumber...');
    let caseCounter = 1000;
    for (const caseItem of cases) {
      const caseNumber = `CASE-${caseCounter++}`;
      await prisma.$executeRaw`UPDATE "Case" SET caseNumber = ${caseNumber} WHERE id = ${caseItem.id}`;
      console.log(`Updated case ${caseItem.id} with caseNumber: ${caseNumber}`);
    }
    
    // 4. Verify the admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'Admin' }
    });
    
    if (admin && !admin.isVerified) {
      await prisma.$executeRaw`UPDATE User SET isVerified = 1 WHERE id = ${admin.id}`;
      console.log(`\nAdmin user ${admin.email} has been verified!`);
    }
    
    console.log('\nMigration completed successfully!');
    
    // Show summary
    const updatedUsers = await prisma.user.findMany({
      select: { email: true, userId: true, role: true, isVerified: true }
    });
    
    console.log('\nUser Summary:');
    updatedUsers.forEach(u => {
      console.log(`- ${u.email} | ID: ${u.userId} | Role: ${u.role} | Verified: ${u.isVerified}`);
    });
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();