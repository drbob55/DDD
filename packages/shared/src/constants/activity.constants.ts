// packages/shared/src/constants/activity.constants.ts

export const ACTIVITY_TYPE = {
  // Case activities
  CASE_CREATED: 'CASE_CREATED',
  CASE_UPDATED: 'CASE_UPDATED',
  CASE_STATUS_CHANGED: 'CASE_STATUS_CHANGED',
  CASE_ARCHIVED: 'CASE_ARCHIVED',
  CASE_RESTORED: 'CASE_RESTORED',
  CASE_ASSIGNED: 'CASE_ASSIGNED',
  CASE_REASSIGNED: 'CASE_REASSIGNED',
  
  // Appointment activities
  APPOINTMENT_SCHEDULED: 'APPOINTMENT_SCHEDULED',
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_NO_SHOW: 'APPOINTMENT_NO_SHOW',
  
  // File activities
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',
  FILE_VIEWED: 'FILE_VIEWED',
  FILE_DOWNLOADED: 'FILE_DOWNLOADED',
  
  // Note activities
  NOTE_ADDED: 'NOTE_ADDED',
  NOTE_UPDATED: 'NOTE_UPDATED',
  NOTE_DELETED: 'NOTE_DELETED',
  
  // User activities
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_PASSWORD_CHANGED: 'USER_PASSWORD_CHANGED',
  
  // Payment activities
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  
  // System activities
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_UPDATE: 'SYSTEM_UPDATE'
} as const;

export const LOG_SEVERITY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
} as const;

export const TARGET_TYPE = {
  USER: 'USER',
  CASE: 'CASE',
  APPOINTMENT: 'APPOINTMENT',
  PAYMENT: 'PAYMENT',
  CLINIC: 'CLINIC',
  FILE: 'FILE',
  NOTE: 'NOTE',
  SYSTEM: 'SYSTEM'
} as const;

// Type definitions for this domain
export type ActivityTypeType = typeof ACTIVITY_TYPE[keyof typeof ACTIVITY_TYPE];
export type LogSeverityType = typeof LOG_SEVERITY[keyof typeof LOG_SEVERITY];
export type TargetTypeType = typeof TARGET_TYPE[keyof typeof TARGET_TYPE];

// Validators for this domain
export const activityValidators = {
  isValidActivityType: (type: string): type is ActivityTypeType => 
    Object.values(ACTIVITY_TYPE).includes(type as any),
  
  isValidLogSeverity: (severity: string): severity is LogSeverityType => 
    Object.values(LOG_SEVERITY).includes(severity as any),
    
  isValidTargetType: (type: string): type is TargetTypeType => 
    Object.values(TARGET_TYPE).includes(type as any)
};

// Helper to categorize activities
export const getActivityCategory = (type: ActivityTypeType): TargetTypeType => {
  if (type.startsWith('CASE_')) return TARGET_TYPE.CASE;
  if (type.startsWith('APPOINTMENT_')) return TARGET_TYPE.APPOINTMENT;
  if (type.startsWith('FILE_')) return TARGET_TYPE.FILE;
  if (type.startsWith('NOTE_')) return TARGET_TYPE.NOTE;
  if (type.startsWith('USER_')) return TARGET_TYPE.USER;
  if (type.startsWith('PAYMENT_')) return TARGET_TYPE.PAYMENT;
  if (type.startsWith('SYSTEM_')) return TARGET_TYPE.SYSTEM;
  return TARGET_TYPE.SYSTEM;
};