import { prisma } from './src';

async function testDatabase() {
  try {
    // Test connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✓ Connected to database');

    // Test query
    const userCount = await prisma.user.count();
    console.log(`✓ Found ${userCount} users`);

    // Test creating a user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'PATIENT'
      }
    });
    console.log('✓ Created test user:', testUser.email);

    // Clean up
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('✓ Cleaned up test data');

    await prisma.$disconnect();
    console.log('✓ Disconnected from database');
  } catch (error) {
    console.error('✗ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
