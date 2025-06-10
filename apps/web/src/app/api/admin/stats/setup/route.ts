// src/services/admin/admin.service.ts
import { prisma } from '@/lib/prisma';
import { NotFoundError, UniqueConstraintError } from '@dental/database';
import bcrypt from 'bcryptjs';

export interface CreateAdminDTO {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface VerifyUserDTO {
  email: string;
}

export class AdminService {
  /**
   * Creates the initial admin user
   * Should only be used during initial setup
   */
  async createInitialAdmin() {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      return {
        exists: true,
        admin: {
          email: existingAdmin.email,
          username: existingAdmin.username,
          isVerified: existingAdmin.isVerified
        }
      };
    }

    // Generate 8-digit user ID
    const userId = this.generateUserId();
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        userId,
        email: 'admin@alignerportal.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        name: 'System Administrator',
        role: 'ADMIN',
        isVerified: true,
        sex: 'PREFER_NOT_TO_SAY',
        dateOfBirth: new Date('1990-01-01')
      }
    });

    return {
      exists: false,
      admin: {
        email: admin.email,
        username: admin.username,
        password: 'admin123',
        note: 'Please change password after first login'
      }
    };
  }

  /**
   * Creates a new admin user with custom details
   */
  async createAdmin(data: CreateAdminDTO) {
    // Check if email or username already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username }
        ]
      }
    });

    if (existing) {
      throw new UniqueConstraintError(
        existing.email === data.email ? 'email' : 'username'
      );
    }

    const userId = this.generateUserId();
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return prisma.user.create({
      data: {
        userId,
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName || 'Admin',
        lastName: data.lastName || 'User',
        name: `${data.firstName || 'Admin'} ${data.lastName || 'User'}`,
        role: 'ADMIN',
        isVerified: true,
        sex: 'PREFER_NOT_TO_SAY',
        dateOfBirth: new Date('1990-01-01')
      }
    });
  }

  /**
   * Verifies a user by email
   */
  async verifyUser(data: VerifyUserDTO) {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new NotFoundError('User', data.email);
    }

    return prisma.user.update({
      where: { email: data.email },
      data: { 
        isVerified: true,
        emailVerificationCode: null,
        phoneVerificationCode: null
      }
    });
  }

  /**
   * Generates an 8-digit user ID
   */
  private generateUserId(): string {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }
}