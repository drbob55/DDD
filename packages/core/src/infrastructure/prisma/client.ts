// packages/core/src/infrastructure/prisma/client.ts

import { prisma as basePrisma } from '@dental/database';
import { validationMiddleware, validateBusinessRules, ValidationError } from './middleware/validation.middleware';

/**
 * Enhanced Prisma Client with validation and logging
 * Following DDD pattern - wrapping infrastructure concerns
 */
class EnhancedPrismaClient {
  private prisma: typeof basePrisma;

  constructor() {
    this.prisma = basePrisma;
    this.setupMiddleware();
  }

  private setupMiddleware() {
    // Add validation middleware
    this.prisma.$use(validationMiddleware());

    // Add business rules validation middleware
    this.prisma.$use(async (params, next) => {
      // For updates, we need to fetch existing data for business rule validation
      if (params.action === 'update' && params.model) {
        const model = params.model.toLowerCase();
        const existingData = await (this.prisma[model] as any).findUnique({
          where: params.args.where,
        });

        if (existingData) {
          validateBusinessRules(params.model, params.args.data, existingData);
        }
      }

      return next(params);
    });

    // Add performance logging in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();

        console.log(
          `[Prisma Query] ${params.model}.${params.action} took ${after - before}ms`
        );

        return result;
      });
    }

    // Add soft delete middleware for models that support it
    this.prisma.$use(async (params, next) => {
      // Handle soft deletes for CaseFile
      if (params.model === 'CaseFile') {
        if (params.action === 'delete') {
          params.action = 'update';
          params.args['data'] = { deletedAt: new Date() };
        }
        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          params.args['data'] = { deletedAt: new Date() };
        }
      }

      return next(params);
    });
  }

  // Delegate all properties to the underlying prisma instance
  get user() { return this.prisma.user; }
  get case() { return this.prisma.case; }
  get appointment() { return this.prisma.appointment; }
  get patient() { return this.prisma.patient; }
  get payment() { return this.prisma.payment; }
  get notification() { return this.prisma.notification; }
  get caseFile() { return this.prisma.caseFile; }
  get caseNote() { return this.prisma.caseNote; }
  get caseActivity() { return this.prisma.caseActivity; }
  get clinic() { return this.prisma.clinic; }
  get log() { return this.prisma.log; }
  get session() { return this.prisma.session; }
  get systemConfig() { return this.prisma.systemConfig; }
  get userPreferences() { return this.prisma.userPreferences; }

  // Delegate methods
  $transaction(fn: any) { return this.prisma.$transaction(fn); }
  $disconnect() { return this.prisma.$disconnect(); }
  $connect() { return this.prisma.$connect(); }
  $executeRaw(query: any) { return this.prisma.$executeRaw(query); }
  $executeRawUnsafe(query: any, ...args: any[]) { return this.prisma.$executeRawUnsafe(query, ...args); }
  $queryRaw(query: any) { return this.prisma.$queryRaw(query); }
  $queryRawUnsafe(query: any, ...args: any[]) { return this.prisma.$queryRawUnsafe(query, ...args); }

  /**
   * Clean up function to disconnect prisma
   */
  async cleanup() {
    await this.$disconnect();
  }
}

// Create singleton instance
let prisma: EnhancedPrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new EnhancedPrismaClient();
} else {
  // In development, reuse the same instance to avoid too many connections
  if (!(global as any).enhancedPrisma) {
    (global as any).enhancedPrisma = new EnhancedPrismaClient();
  }
  prisma = (global as any).enhancedPrisma;
}

// Handle cleanup on app termination
process.on('beforeExit', async () => {
  await prisma.cleanup();
});

export { prisma };

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Transaction helper with automatic rollback on validation errors
 */
export async function transaction<T>(
  fn: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}

// Re-export for convenience
export { ValidationError } from './middleware/validation.middleware';