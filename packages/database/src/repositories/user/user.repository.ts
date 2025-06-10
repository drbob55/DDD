import { prisma } from '../../client';
import { BaseRepository } from '../base/repository.base';
import { IUserRepository } from './user.repository.interface';
import { User } from '@prisma/client';
import { NotFoundError } from '../../errors';

export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor() {
    super('user', prisma);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prismaClient.user.findUnique({
      where: { email }
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prismaClient.user.findUnique({
      where: { username }
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prismaClient.user.findUnique({
      where: { phone }
    });
  }

  async findByRole(role: string): Promise<User[]> {
    return this.prismaClient.user.findMany({
      where: { role }
    });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.prismaClient.user.findMany({
      where: { isActive: true }
    });
  }

  async findVerifiedUsers(): Promise<User[]> {
    return this.prismaClient.user.findMany({
      where: { isVerified: true }
    });
  }

  async verifyUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    return this.prismaClient.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        emailVerificationCode: null,
        phoneVerificationCode: null
      }
    });
  }

  async lockUser(userId: string, until: Date): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: { lockedUntil: until }
    });
  }

  async unlockUser(userId: string): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0
      }
    });
  }

  async incrementFailedAttempts(userId: string): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 }
      }
    });
  }

  async resetFailedAttempts(userId: string): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0 }
    });
  }

  async updateLastLogin(userId: string): Promise<User> {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  async findUsersWithPreferences(userId: string): Promise<User & { preferences: any }> {
    const user = await this.prismaClient.user.findUnique({
      where: { id: userId },
      include: { preferences: true }
    });

    if (!user) throw new NotFoundError('User', userId);
    return user as User & { preferences: any };
  }

  async findDentistsWithCases(): Promise<User[]> {
    return this.prismaClient.user.findMany({
      where: {
        role: 'DENTIST',
        casesAsDentist: { some: {} }
      }
    });
  }

  async findPatientsWithActiveCases(): Promise<User[]> {
    return this.prismaClient.user.findMany({
      where: {
        role: 'PATIENT',
        casesAsPatient: {
          some: {
            status: { in: ['NEW', 'IN_PROGRESS', 'REVIEW'] }
          }
        }
      }
    });
  }
}
