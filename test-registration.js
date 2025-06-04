// test-registration.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testRegistration() {
  try {
    console.log('Testing registration with phone only...\n');
    
    // Test data
    const testUser = {
      userId: Math.floor(10000000 + Math.random() * 90000000).toString(),
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      username: `testuser${Date.now()}`,
      password: await bcrypt.hash('password123', 10),
      phone: '+1234567890',
      role: 'PATIENT',
      isVerified: false,
      // Try without email to see what happens
    };

    console.log('Attempting to create user with data:');
    console.log(JSON.stringify(testUser, null, 2));
    
    const user = await prisma.user.create({
      data: testUser
    });
    
    console.log('\n✅ User created successfully!');
    console.log('User ID:', user.id);
    
  } catch (error) {
    console.error('\n❌ Error creating user:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'P2002') {
      console.error('Unique constraint violation - duplicate data');
    } else if (error.code === 'P2003') {
      console.error('Foreign key constraint violation');
    } else if (error.code === 'P2011') {
      console.error('Null constraint violation on field:', error.meta?.constraint);
    }
    
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRegistration();