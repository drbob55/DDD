// verify-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function verifyAdmin() {
  try {
    // Find admin by username or email
    const adminByUsername = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    const adminByEmail = await prisma.user.findUnique({
      where: { email: 'admin@alignerportal.com' }
    });

    const adminByRole = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    console.log('🔍 Searching for admin users...\n');

    if (adminByUsername) {
      console.log('✅ Found admin by username:');
      console.log('   ID:', adminByUsername.id);
      console.log('   User ID:', adminByUsername.userId);
      console.log('   Email:', adminByUsername.email);
      console.log('   Role:', adminByUsername.role);
      console.log('   Verified:', adminByUsername.isVerified);
      console.log('   Created:', adminByUsername.createdAt);
    }

    if (adminByEmail && adminByEmail.id !== adminByUsername?.id) {
      console.log('\n✅ Found different admin by email:');
      console.log('   ID:', adminByEmail.id);
      console.log('   Username:', adminByEmail.username);
      console.log('   Role:', adminByEmail.role);
      console.log('   Verified:', adminByEmail.isVerified);
    }

    if (adminByRole && adminByRole.id !== adminByUsername?.id && adminByRole.id !== adminByEmail?.id) {
      console.log('\n✅ Found different user with ADMIN role:');
      console.log('   ID:', adminByRole.id);
      console.log('   Email:', adminByRole.email);
      console.log('   Username:', adminByRole.username);
      console.log('   Verified:', adminByRole.isVerified);
    }

    // Update the admin to ensure it's properly configured
    const adminToUpdate = adminByUsername || adminByEmail || adminByRole;
    
    if (adminToUpdate) {
      const updates = {};
      
      // Ensure it has ADMIN role
      if (adminToUpdate.role !== 'ADMIN') {
        updates.role = 'ADMIN';
      }
      
      // Ensure it's verified
      if (!adminToUpdate.isVerified) {
        updates.isVerified = true;
      }
      
      // Ensure it has a userId if missing
      if (!adminToUpdate.userId) {
        updates.userId = Math.floor(10000000 + Math.random() * 90000000).toString();
      }
      
      if (Object.keys(updates).length > 0) {
        console.log('\n🔧 Updating admin user...');
        const updatedAdmin = await prisma.user.update({
          where: { id: adminToUpdate.id },
          data: updates
        });
        console.log('✅ Admin updated successfully!');
      } else {
        console.log('\n✅ Admin user is properly configured!');
      }
      
      // Reset password to known value
      console.log('\n🔐 Resetting admin password...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.update({
        where: { id: adminToUpdate.id },
        data: { password: hashedPassword }
      });
      
      console.log('\n✅ Admin credentials:');
      console.log('   Email:', adminToUpdate.email);
      console.log('   Username:', adminToUpdate.username || 'N/A');
      console.log('   Password: admin123');
      console.log('\n🚀 You can now login with these credentials!');
      
    } else {
      console.log('❌ No admin user found in database!');
    }

    // Show all users for reference
    console.log('\n📋 All users in database:');
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        username: true,
        role: true,
        isVerified: true
      }
    });
    
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.username || 'no username'}) | Role: ${user.role} | Verified: ${user.isVerified}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdmin();