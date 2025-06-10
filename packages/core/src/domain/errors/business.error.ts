// packages/core/src/domain/errors/business.error.ts

/**
 * Custom error class for business logic errors
 * These are errors that occur due to business rule violations,
 * not system failures
 */
export class BusinessError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly field?: string;
  public readonly validValues?: string[];
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    options?: {
      field?: string;
      validValues?: string[];
      metadata?: Record<string, any>;
    }
  ) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = statusCode;
    this.field = options?.field;
    this.validValues = options?.validValues;
    this.metadata = options?.metadata;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      field: this.field,
      validValues: this.validValues,
      metadata: this.metadata
    };
  }
}

/**
 * Common business error codes
 */
export const BusinessErrorCode = {
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Business rule violations
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Payment errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  
  // Case/Appointment specific
  INVALID_CASE_STATUS: 'INVALID_CASE_STATUS',
  APPOINTMENT_CONFLICT: 'APPOINTMENT_CONFLICT',
  INVALID_TIME_SLOT: 'INVALID_TIME_SLOT',
  
  // User management
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
  INVALID_ROLE: 'INVALID_ROLE',
  CANNOT_DELETE_SELF: 'CANNOT_DELETE_SELF',
  USER_HAS_DEPENDENCIES: 'USER_HAS_DEPENDENCIES'
} as const;

export type BusinessErrorCode = typeof BusinessErrorCode[keyof typeof BusinessErrorCode];

/**
 * Factory functions for common business errors
 */
export class BusinessErrors {
  static validationFailed(field: string, message: string, validValues?: string[]) {
    return new BusinessError(
      message,
      BusinessErrorCode.VALIDATION_FAILED,
      400,
      { field, validValues }
    );
  }

  static unauthorized(message = 'Unauthorized') {
    return new BusinessError(
      message,
      BusinessErrorCode.UNAUTHORIZED,
      401
    );
  }

  static forbidden(message = 'Access denied') {
    return new BusinessError(
      message,
      BusinessErrorCode.FORBIDDEN,
      403
    );
  }

  static notFound(resource: string, id?: string) {
    return new BusinessError(
      `${resource} ${id ? `with id ${id} ` : ''}not found`,
      BusinessErrorCode.NOT_FOUND,
      404,
      { resource, id }
    );
  }

  static alreadyExists(resource: string, field: string, value: string) {
    return new BusinessError(
      `${resource} with ${field} "${value}" already exists`,
      BusinessErrorCode.ALREADY_EXISTS,
      409,
      { resource, field, value }
    );
  }

  static invalidStateTransition(
    entity: string,
    fromState: string,
    toState: string,
    validTransitions: string[]
  ) {
    return new BusinessError(
      `Invalid ${entity} status transition from ${fromState} to ${toState}`,
      BusinessErrorCode.INVALID_STATE_TRANSITION,
      400,
      { 
        entity,
        fromState,
        toState,
        validValues: validTransitions,
        metadata: { validTransitions }
      }
    );
  }

  static businessRuleViolation(rule: string, message: string, metadata?: Record<string, any>) {
    return new BusinessError(
      message,
      BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      400,
      { metadata: { rule, ...metadata } }
    );
  }

  static accountLocked(lockoutEndTime?: Date) {
    return new BusinessError(
      'Account is locked due to multiple failed login attempts',
      BusinessErrorCode.ACCOUNT_LOCKED,
      403,
      { 
        metadata: { 
          lockoutEndTime: lockoutEndTime?.toISOString() 
        } 
      }
    );
  }

  static appointmentConflict(existingAppointment: any) {
    return new BusinessError(
      'Time slot is already booked',
      BusinessErrorCode.APPOINTMENT_CONFLICT,
      409,
      { 
        metadata: { 
          conflictingAppointmentId: existingAppointment.id,
          conflictingTime: existingAppointment.date
        } 
      }
    );
  }
}

/**
 * Type guard to check if an error is a BusinessError
 */
export function isBusinessError(error: unknown): error is BusinessError {
  return error instanceof BusinessError;
}

/**
 * Helper to handle errors in API routes
 */
export function handleApiError(error: unknown): { 
  message: string; 
  statusCode: number; 
  response: any 
} {
  console.error('API Error:', error);

  if (isBusinessError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      response: {
        success: false,
        ...error.toJSON()
      }
    };
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any;
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] || 'field';
      return {
        message: `A record with this ${field} already exists`,
        statusCode: 409,
        response: {
          success: false,
          error: `A record with this ${field} already exists`,
          code: BusinessErrorCode.ALREADY_EXISTS,
          field
        }
      };
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return {
        message: 'Record not found',
        statusCode: 404,
        response: {
          success: false,
          error: 'Record not found',
          code: BusinessErrorCode.NOT_FOUND
        }
      };
    }
  }

  // Default error response
  return {
    message: 'Internal server error',
    statusCode: 500,
    response: {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    }
  };
}