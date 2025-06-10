import { User } from '@prisma/client';
import { IRepository } from '../base/repository.interface';

export interface IUserRepository extends IRepository<User> {
  // Domain-specific queries
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByRole(role: string): Promise<User[]>;
  findActiveUsers(): Promise<User[]>;
  findVerifiedUsers(): Promise<User[]>;
  
  // Business operations
  verifyUser(userId: string): Promise<User>;
  lockUser(userId: string, until: Date): Promise<User>;
  unlockUser(userId: string): Promise<User>;
  incrementFailedAttempts(userId: string): Promise<User>;
  resetFailedAttempts(userId: string): Promise<User>;
  updateLastLogin(userId: string): Promise<User>;
  
  // Complex queries
  findUsersWithPreferences(userId: string): Promise<User & { preferences: any }>;
  findDentistsWithCases(): Promise<User[]>;
  findPatientsWithActiveCases(): Promise<User[]>;
}
