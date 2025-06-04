// test-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function quickTest() {
  try {
    // 1. Check if we can connect to database
    console.log('Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected! Found ${userCount} users.`);

    // 2. List all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        userId: true,
        email: true,
        username: true,
        role: true,
        isVerified: true,
        sex: true
      }
    });

    console.log('\n📋 Current users:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - Verified: ${user.isVerified}`);
    });

    // 3. Check for admin
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('\n❌ No admin found. Creating one...');
      
      // Generate userId
      const userId = Math.floor(10000000 + Math.random() * 90000000).toString();
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await prisma.user.create({
        data: {
          userId: userId,
          email: 'admin@alignerportal.com',
          username: 'admin',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          name: 'System Administrator',
          role: 'ADMIN',
          isVerified: true,
          sex: 'PREFER_NOT_TO_SAY',
          dateOfBirth: new Date('1990-01-01'),
        }
      });

      console.log('✅ Admin created!');
      console.log('Email:', newAdmin.email);
      console.log('Password: admin123');
    } else {
      console.log('\n✅ Admin exists:', admin.email);
      
      // Verify if not already
      if (!admin.isVerified) {
        await prisma.user.update({
          where: { id: admin.id },
          data: { isVerified: true }
        });
        console.log('✅ Admin verified!');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'P2002') {
      console.error('Unique constraint violation - user already exists');
    }
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();