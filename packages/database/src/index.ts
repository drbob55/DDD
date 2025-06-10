/**
 * @dental/database - Infrastructure Layer
 */

import { prisma as prismaInstance, db } from './client';

// Import all repositories first
import { UserRepository } from './repositories/user/user.repository';
import { CaseRepository } from './repositories/case/case.repository';
import { AppointmentRepository } from './repositories/appointment/appointment.repository';
import { PaymentRepository } from './repositories/payment/payment.repository';
import { NotificationRepository } from './repositories/notification/notification.repository';

// Import all interfaces
import type { IUserRepository } from './repositories/user/user.repository.interface';
import type { ICaseRepository } from './repositories/case/case.repository.interface';
import type { IAppointmentRepository } from './repositories/appointment/appointment.repository.interface';
import type { IPaymentRepository } from './repositories/payment/payment.repository.interface';
import type { INotificationRepository } from './repositories/notification/notification.repository.interface';

// Re-export the prisma instance and utilities
export const prisma = prismaInstance;
export { db };

// Export all repositories
export {
  UserRepository,
  CaseRepository,
  AppointmentRepository,
  PaymentRepository,
  NotificationRepository
};

// Export repository interfaces
export type {
  IUserRepository,
  ICaseRepository,
  IAppointmentRepository,
  IPaymentRepository,
  INotificationRepository
};

// Export base interfaces
export type { 
  IRepository, 
  ISpecification,
  IPaginationOptions,
  IPaginatedResult,
  IUnitOfWork
} from './repositories/base/repository.interface';

// Export errors
export { 
  DatabaseError, 
  NotFoundError, 
  UniqueConstraintError,
  BusinessError,
  ValidationError,
  TransactionError,
  handlePrismaError
} from './errors';

// Export types from Prisma that actually exist
export type {
  User,
  Case,
  Appointment,
  Payment,
  Notification
} from '@prisma/client';

// Create a repository factory for dependency injection
export interface IRepositoryFactory {
  createUserRepository(): IUserRepository;
  createCaseRepository(): ICaseRepository;
  createAppointmentRepository(): IAppointmentRepository;
  createPaymentRepository(): IPaymentRepository;
  createNotificationRepository(): INotificationRepository;
}

export class RepositoryFactory implements IRepositoryFactory {
  private static instance: RepositoryFactory;

  private constructor() {}

  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  createUserRepository(): IUserRepository {
    return new UserRepository();
  }

  createCaseRepository(): ICaseRepository {
    return new CaseRepository();
  }

  createAppointmentRepository(): IAppointmentRepository {
    return new AppointmentRepository();
  }

  createPaymentRepository(): IPaymentRepository {
    return new PaymentRepository();
  }

  createNotificationRepository(): INotificationRepository {
    return new NotificationRepository();
  }
}

// Export singleton instance
export const repositoryFactory = RepositoryFactory.getInstance();

// Default export for convenience
export default prisma;
