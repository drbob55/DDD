// test-auth-complete.js
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🔍 Authentication Test Suite\n');
    
    // 1. List all users
    console.log('1️⃣ All users in database:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isVerified: true,
        password: true
      }
    });
    
    users.forEach(user => {
      console.log(`\n   Email: ${user.email}`);
      console.log(`   Username: ${user.username || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.isVerified}`);
      console.log(`   Has password: ${!!user.password}`);
    });
    
    // 2. Create a test user with known password
    console.log('\n\n2️⃣ Creating test user with bcryptjs...');
    const testPassword = 'testpass123';
    const hashedPassword = await bcryptjs.hash(testPassword, 12);
    
    // Delete existing test user if exists
    await prisma.user.deleteMany({
      where: { email: 'authtest@example.com' }
    });
    
    const testUser = await prisma.user.create({
      data: {
        userId: '99999999',
        firstName: 'Auth',
        lastName: 'Test',
        name: 'Auth Test',
        email: 'authtest@example.com',
        username: 'authtest',
        password: hashedPassword,
        role: 'DENTIST',
        sex: 'Male',
        isVerified: true,
        profileCompleted: true,
      }
    });
    
    console.log('   ✅ Test user created');
    console.log(`   Email: authtest@example.com`);
    console.log(`   Password: ${testPassword}`);
    
    // 3. Test password comparison
    console.log('\n3️⃣ Testing password comparison:');
    const compareResult = await bcryptjs.compare(testPassword, hashedPassword);
    console.log(`   Direct comparison: ${compareResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // 4. Fetch user and test again
    const fetchedUser = await prisma.user.findUnique({
      where: { email: 'authtest@example.com' }
    });
    
    const dbCompareResult = await bcryptjs.compare(testPassword, fetchedUser.password);
    console.log(`   Database comparison: ${dbCompareResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // 5. Test with different bcryptjs methods
    console.log('\n4️⃣ Testing different import methods:');
    const bcryptjs2 = require('bcryptjs');
    const compareResult2 = await bcryptjs2.compare(testPassword, fetchedUser.password);
    console.log(`   Using require: ${compareResult2 ? '✅ PASS' : '❌ FAIL'}`);
    
    // 6. Show bcryptjs info
    console.log('\n5️⃣ Bcryptjs information:');
    console.log(`   Version: ${require('bcryptjs/package.json').version}`);
    console.log(`   Hash example: ${hashedPassword.substring(0, 20)}...`);
    
    console.log('\n\n✅ Test complete!');
    console.log('Try logging in with:');
    console.log('   Email: authtest@example.com');
    console.log('   Password: testpass123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();