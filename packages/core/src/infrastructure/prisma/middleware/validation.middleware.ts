// packages/core/src/infrastructure/prisma/middleware/validation.middleware.ts

import { Prisma } from '@prisma/client';
import * as constants from '@dental/shared/constants';

/**
 * Custom validation error for better error handling
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public value: any,
    public validValues: string[]
  ) {
    super(`Invalid ${field}: "${value}". Must be one of: ${validValues.join(', ')}`);
    this.name = 'ValidationError';
  }
}

/**
 * Prisma middleware that validates all constant values before database operations
 */
export function validationMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    try {
      // Validate on create, update, upsert operations
      if (['create', 'update', 'upsert'].includes(params.action)) {
        const data = params.action === 'upsert' 
          ? { ...params.args.create, ...params.args.update }
          : params.args.data;
          
        if (data) {
          validateByModel(params.model, data);
        }
      }

      // Validate on createMany
      if (params.action === 'createMany') {
        const dataArray = Array.isArray(params.args.data) 
          ? params.args.data 
          : [params.args.data];
        
        dataArray.forEach((data: any) => {
          validateByModel(params.model, data);
        });
      }

      // Validate on updateMany
      if (params.action === 'updateMany' && params.args.data) {
        validateByModel(params.model, params.args.data);
      }

      // Proceed with the operation
      return next(params);
    } catch (error) {
      // Log validation errors
      console.error(`Validation error in ${params.model}.${params.action}:`, error);
      throw error;
    }
  };
}

/**
 * Route validation to appropriate model validator
 */
function validateByModel(model: string | undefined, data: any) {
  if (!model) return;

  switch (model) {
    case 'User':
      validateUser(data);
      break;
    case 'UserPreferences':
      validateUserPreferences(data);
      break;
    case 'Case':
      validateCase(data);
      break;
    case 'CaseFile':
      validateCaseFile(data);
      break;
    case 'CaseNote':
      validateCaseNote(data);
      break;
    case 'CaseActivity':
      validateCaseActivity(data);
      break;
    case 'Appointment':
      validateAppointment(data);
      break;
    case 'Payment':
      validatePayment(data);
      break;
    case 'Notification':
      validateNotification(data);
      break;
    case 'Log':
      validateLog(data);
      break;
    case 'SystemConfig':
      validateSystemConfig(data);
      break;
  }
}

// ===========================
// MODEL VALIDATORS
// ===========================

function validateUser(data: any) {
  if (data.role !== undefined && !constants.validators.isValidUserRole(data.role)) {
    throw new ValidationError('role', data.role, Object.values(constants.USER_ROLES));
  }

  if (data.sex !== undefined && data.sex !== null && !constants.validators.isValidSex(data.sex)) {
    throw new ValidationError('sex', data.sex, Object.values(constants.SEX_OPTIONS));
  }

  if (data.verificationMethod !== undefined && data.verificationMethod !== null) {
    if (!Object.values(constants.VERIFICATION_METHODS).includes(data.verificationMethod)) {
      throw new ValidationError('verificationMethod', data.verificationMethod, Object.values(constants.VERIFICATION_METHODS));
    }
  }
}

function validateUserPreferences(data: any) {
  if (data.language !== undefined && !Object.values(constants.LANGUAGE).includes(data.language)) {
    throw new ValidationError('language', data.language, Object.values(constants.LANGUAGE));
  }

  if (data.timezone !== undefined && !Object.values(constants.TIMEZONE).includes(data.timezone)) {
    throw new ValidationError('timezone', data.timezone, Object.values(constants.TIMEZONE));
  }

  if (data.dateFormat !== undefined && !Object.values(constants.DATE_FORMAT).includes(data.dateFormat)) {
    throw new ValidationError('dateFormat', data.dateFormat, Object.values(constants.DATE_FORMAT));
  }

  if (data.timeFormat !== undefined && !Object.values(constants.TIME_FORMAT).includes(data.timeFormat)) {
    throw new ValidationError('timeFormat', data.timeFormat, Object.values(constants.TIME_FORMAT));
  }
}

function validateCase(data: any) {
  if (data.status !== undefined && !constants.validators.isValidCaseStatus(data.status)) {
    throw new ValidationError('status', data.status, Object.values(constants.CASE_STATUS));
  }

  if (data.priority !== undefined && !constants.validators.isValidCasePriority(data.priority)) {
    throw new ValidationError('priority', data.priority, Object.values(constants.CASE_PRIORITY));
  }

  if (data.type !== undefined && !constants.validators.isValidCaseType(data.type)) {
    throw new ValidationError('type', data.type, Object.values(constants.CASE_TYPE));
  }

  if (data.treatmentType !== undefined && !Object.values(constants.TREATMENT_TYPE).includes(data.treatmentType)) {
    throw new ValidationError('treatmentType', data.treatmentType, Object.values(constants.TREATMENT_TYPE));
  }

  if (data.paymentStatus !== undefined && !constants.validators.isValidPaymentStatus(data.paymentStatus)) {
    throw new ValidationError('paymentStatus', data.paymentStatus, Object.values(constants.PAYMENT_STATUS));
  }

  if (data.currency !== undefined && !Object.values(constants.CURRENCY).includes(data.currency)) {
    throw new ValidationError('currency', data.currency, Object.values(constants.CURRENCY));
  }
}

function validateCaseFile(data: any) {
  if (data.type !== undefined && !constants.validators.isValidFileType(data.type)) {
    throw new ValidationError('type', data.type, Object.values(constants.FILE_TYPE));
  }

  // Optional: Validate mime types
  if (data.mimeType !== undefined && data.type) {
    const validMimeTypes = getValidMimeTypesForFileType(data.type);
    if (validMimeTypes.length > 0 && !validMimeTypes.includes(data.mimeType)) {
      console.warn(`Unusual mime type "${data.mimeType}" for file type "${data.type}"`);
    }
  }
}

function validateCaseNote(data: any) {
  if (data.category !== undefined && !constants.validators.isValidNoteCategory(data.category)) {
    throw new ValidationError('category', data.category, Object.values(constants.NOTE_CATEGORY));
  }
}

function validateCaseActivity(data: any) {
  if (data.action !== undefined && !constants.validators.isValidActivityType(data.action)) {
    throw new ValidationError('action', data.action, Object.values(constants.ACTIVITY_TYPE));
  }
}

function validateAppointment(data: any) {
  if (data.status !== undefined && !constants.validators.isValidAppointmentStatus(data.status)) {
    throw new ValidationError('status', data.status, Object.values(constants.APPOINTMENT_STATUS));
  }

  if (data.type !== undefined && !constants.validators.isValidAppointmentType(data.type)) {
    throw new ValidationError('type', data.type, Object.values(constants.APPOINTMENT_TYPE));
  }

  // Validate duration
  if (data.duration !== undefined) {
    if (data.duration < constants.BUSINESS_RULES.MIN_APPOINTMENT_DURATION) {
      throw new Error(`Appointment duration must be at least ${constants.BUSINESS_RULES.MIN_APPOINTMENT_DURATION} minutes`);
    }
    if (data.duration > constants.BUSINESS_RULES.MAX_APPOINTMENT_DURATION) {
      throw new Error(`Appointment duration cannot exceed ${constants.BUSINESS_RULES.MAX_APPOINTMENT_DURATION} minutes`);
    }
  }
}

function validatePayment(data: any) {
  if (data.status !== undefined && !constants.validators.isValidPaymentStatus(data.status)) {
    throw new ValidationError('status', data.status, Object.values(constants.PAYMENT_STATUS));
  }

  if (data.method !== undefined && data.method !== null && !constants.validators.isValidPaymentMethod(data.method)) {
    throw new ValidationError('method', data.method, Object.values(constants.PAYMENT_METHOD));
  }

  if (data.currency !== undefined && !Object.values(constants.CURRENCY).includes(data.currency)) {
    throw new ValidationError('currency', data.currency, Object.values(constants.CURRENCY));
  }

  // Validate amount
  if (data.amount !== undefined && data.amount < 0) {
    throw new Error('Payment amount cannot be negative');
  }
}

function validateNotification(data: any) {
  if (data.type !== undefined && !constants.validators.isValidNotificationType(data.type)) {
    throw new ValidationError('type', data.type, Object.values(constants.NOTIFICATION_TYPE));
  }

  if (data.category !== undefined && !Object.values(constants.NOTIFICATION_CATEGORY).includes(data.category)) {
    throw new ValidationError('category', data.category, Object.values(constants.NOTIFICATION_CATEGORY));
  }

  if (data.relatedEntityType !== undefined && data.relatedEntityType !== null) {
    if (!constants.validators.isValidTargetType(data.relatedEntityType)) {
      throw new ValidationError('relatedEntityType', data.relatedEntityType, Object.values(constants.TARGET_TYPE));
    }
  }
}

function validateLog(data: any) {
  if (data.action !== undefined && !constants.validators.isValidActivityType(data.action)) {
    throw new ValidationError('action', data.action, Object.values(constants.ACTIVITY_TYPE));
  }

  if (data.targetType !== undefined && !constants.validators.isValidTargetType(data.targetType)) {
    throw new ValidationError('targetType', data.targetType, Object.values(constants.TARGET_TYPE));
  }

  if (data.severity !== undefined && !constants.validators.isValidLogSeverity(data.severity)) {
    throw new ValidationError('severity', data.severity, Object.values(constants.LOG_SEVERITY));
  }
}

function validateSystemConfig(data: any) {
  if (data.defaultCurrency !== undefined && !Object.values(constants.CURRENCY).includes(data.defaultCurrency)) {
    throw new ValidationError('defaultCurrency', data.defaultCurrency, Object.values(constants.CURRENCY));
  }

  if (data.defaultLanguage !== undefined && !Object.values(constants.LANGUAGE).includes(data.defaultLanguage)) {
    throw new ValidationError('defaultLanguage', data.defaultLanguage, Object.values(constants.LANGUAGE));
  }

  if (data.defaultTimezone !== undefined && !Object.values(constants.TIMEZONE).includes(data.defaultTimezone)) {
    throw new ValidationError('defaultTimezone', data.defaultTimezone, Object.values(constants.TIMEZONE));
  }

  // Validate business rules
  if (data.passwordMinLength !== undefined && data.passwordMinLength < constants.BUSINESS_RULES.MIN_PASSWORD_LENGTH) {
    throw new Error(`Password minimum length cannot be less than ${constants.BUSINESS_RULES.MIN_PASSWORD_LENGTH}`);
  }
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Get valid mime types for a file type
 */
function getValidMimeTypesForFileType(fileType: string): string[] {
  const mimeTypeMap: Record<string, string[]> = {
    [constants.FILE_TYPE.UPPER_SCAN]: ['model/stl', 'model/obj', 'application/x-ply'],
    [constants.FILE_TYPE.LOWER_SCAN]: ['model/stl', 'model/obj', 'application/x-ply'],
    [constants.FILE_TYPE.BITE_SCAN]: ['model/stl', 'model/obj', 'application/x-ply'],
    [constants.FILE_TYPE.FULL_SCAN]: ['model/stl', 'model/obj', 'application/x-ply'],
    [constants.FILE_TYPE.XRAY]: ['image/jpeg', 'image/png', 'application/dicom'],
    [constants.FILE_TYPE.PHOTO]: ['image/jpeg', 'image/png'],
    [constants.FILE_TYPE.TREATMENT_PLAN]: ['application/pdf'],
    [constants.FILE_TYPE.CONSENT_FORM]: ['application/pdf'],
    [constants.FILE_TYPE.PRESCRIPTION]: ['application/pdf'],
    [constants.FILE_TYPE.INVOICE]: ['application/pdf'],
    [constants.FILE_TYPE.REPORT]: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };

  return mimeTypeMap[fileType] || [];
}

// ===========================
// BUSINESS RULE VALIDATORS
// ===========================

/**
 * Business rule validations with support for existing data comparison
 */
export function validateBusinessRules(model: string, data: any, existingData?: any) {
  switch (model) {
    case 'Case':
      validateCaseBusinessRules(data, existingData);
      break;
    case 'Appointment':
      validateAppointmentBusinessRules(data, existingData);
      break;
    case 'User':
      validateUserBusinessRules(data, existingData);
      break;
  }
}

function validateCaseBusinessRules(data: any, existingData?: any) {
  // Validate status transitions
  if (data.status && existingData?.status) {
    const currentStatus = existingData.status as constants.CaseStatus;
    const newStatus = data.status as constants.CaseStatus;
    
    const validTransitions = constants.CASE_STATUS_TRANSITIONS[currentStatus] || [];
    if (!validTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Valid transitions: ${validTransitions.join(', ')}`
      );
    }
  }

  // Validate payment status rules
  if (data.paymentStatus === constants.PAYMENT_STATUS.PAID && data.paidAmount !== undefined) {
    if (existingData && data.paidAmount < existingData.actualCost) {
      throw new Error('Cannot mark as PAID when paid amount is less than actual cost');
    }
  }
}

function validateAppointmentBusinessRules(data: any, existingData?: any) {
  // Validate status transitions
  if (data.status && existingData?.status) {
    const currentStatus = existingData.status as constants.AppointmentStatus;
    const newStatus = data.status as constants.AppointmentStatus;
    
    const validTransitions = constants.APPOINTMENT_STATUS_TRANSITIONS[currentStatus] || [];
    if (!validTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Valid transitions: ${validTransitions.join(', ')}`
      );
    }
  }

  // Validate appointment timing
  if (data.scheduledAt) {
    const scheduledDate = new Date(data.scheduledAt);
    const now = new Date();
    
    // Cannot schedule appointments in the past (unless it's a data migration)
    if (scheduledDate < now && !existingData) {
      throw new Error('Cannot schedule appointments in the past');
    }
  }
}

function validateUserBusinessRules(data: any, existingData?: any) {
  // Validate password length
  if (data.password && data.password.length < constants.BUSINESS_RULES.MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${constants.BUSINESS_RULES.MIN_PASSWORD_LENGTH} characters long`);
  }

  // Validate role changes
  if (data.role && existingData?.role) {
    // Add any role change restrictions here
    // For example, prevent changing from ADMIN to other roles without special permission
  }
}