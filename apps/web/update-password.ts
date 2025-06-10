import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePassword() {
  const newPassword = 'password123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update dentist1's password
  const updated = await prisma.user.updateMany({
    where: { 
      OR: [
        { username: 'dentist1' },
        { email: 'dentist1@dental.com' }
      ]
    },
    data: {
      password: hashedPassword,
    },
  });
  
  console.log(`Updated ${updated.count} user(s) with new password: ${newPassword}`);
}

updatePassword()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
