// create-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Generate 8-digit user ID
    const userId = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create admin user
    const admin = await prisma.user.create({
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

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('Email: admin@alignerportal.com');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('');
    console.log('User ID:', admin.userId);
    console.log('Database ID:', admin.id);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('❌ Admin user already exists!');
      
      // Try to find and display existing admin
      const existingAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });
      
      if (existingAdmin) {
        console.log('');
        console.log('Existing admin details:');
        console.log('Email:', existingAdmin.email);
        console.log('Username:', existingAdmin.username);
        console.log('Verified:', existingAdmin.isVerified);
        
        // Verify the admin if not already verified
        if (!existingAdmin.isVerified) {
          await prisma.user.update({
            where: { id: existingAdmin.id },
            data: { isVerified: true }
          });
          console.log('✅ Admin account has been verified!');
        }
      }
    } else {
      console.error('Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();