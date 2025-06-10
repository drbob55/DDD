// packages/database/src/errors.ts
/**
 * Database-specific errors
 * Part of the Infrastructure Layer
 */

/**
 * Base database error
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Entity not found error
 */
export class NotFoundError extends DatabaseError {
  constructor(
    public readonly entity: string,
    public readonly id?: string | number
  ) {
    super(
      id ? `${entity} with id ${id} not found` : `${entity} not found`,
      'NOT_FOUND'
    );
    this.name = 'NotFoundError';
  }
}

/**
 * Unique constraint violation
 */
export class UniqueConstraintError extends DatabaseError {
  constructor(
    public readonly entity: string,
    public readonly field: string,
    public readonly value: string
  ) {
    super(
      `${entity} with ${field} "${value}" already exists`,
      'UNIQUE_CONSTRAINT'
    );
    this.name = 'UniqueConstraintError';
  }
}

/**
 * Business rule violation
 */
export class BusinessError extends DatabaseError {
  constructor(
    message: string,
    public readonly rule?: string
  ) {
    super(message, 'BUSINESS_RULE_VIOLATION');
    this.name = 'BusinessError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends DatabaseError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    public readonly validValues?: string[]
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Transaction error
 */
export class TransactionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'TRANSACTION_ERROR', cause);
    this.name = 'TransactionError';
  }
}

/**
 * Convert Prisma errors to domain errors
 */
export function handlePrismaError(error: any): never {
  // Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    throw new UniqueConstraintError('Record', field, 'unknown');
  }

  // Record not found
  if (error.code === 'P2025') {
    throw new NotFoundError('Record');
  }

  // Foreign key constraint violation
  if (error.code === 'P2003') {
    throw new BusinessError('Referenced record does not exist');
  }

  // Required field missing
  if (error.code === 'P2012') {
    throw new ValidationError('Missing required field');
  }

  // Default to generic database error
  throw new DatabaseError(error.message || 'Database operation failed', error.code);
}