// debug-auth.js
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function debugAuth() {
  const identifier = process.argv[2];
  const password = process.argv[3];

  if (!identifier || !password) {
    console.log('Usage: node debug-auth.js <email/username> <password>');
    process.exit(1);
  }

  try {
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Username:', user.username);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Verified:', user.isVerified);
    console.log('   Password hash exists:', !!user.password);
    console.log('   Password hash length:', user.password?.length);
    console.log('   Hash starts with:', user.password?.substring(0, 10) + '...');

    // Test password
    console.log('\n🔐 Testing password...');
    const isValid = await bcryptjs.compare(password, user.password);
    console.log('   Password valid:', isValid);

    // Test with a new hash
    console.log('\n🔧 Testing with fresh hash...');
    const newHash = await bcryptjs.hash(password, 12);
    const testCompare = await bcryptjs.compare(password, newHash);
    console.log('   Fresh hash test:', testCompare);
    
    // Check bcryptjs version
    console.log('\n📦 Bcryptjs version check:');
    const bcryptVersion = require('bcryptjs/package.json').version;
    console.log('   Version:', bcryptVersion);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();