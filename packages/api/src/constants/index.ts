export const ROLES = {
  PATIENT: 'PATIENT',
  DENTIST: 'DENTIST',
  REVIEWER: 'REVIEWER',
  MANUFACTURER: 'MANUFACTURER',
  ADMIN: 'ADMIN'
} as const;

export const CASE_STATUS = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  AWAITING_CONSENT: 'AWAITING_CONSENT',
  IN_TREATMENT: 'IN_TREATMENT',
  MANUFACTURING: 'MANUFACTURING',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
} as const;

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'RESCHEDULED'
} as const;

export const ACTIVITY_TYPE = {
  CASE_CREATED: 'CASE_CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  CASE_ARCHIVED: 'CASE_ARCHIVED',
  CASE_RESTORED: 'CASE_RESTORED',
  APPOINTMENT_SCHEDULED: 'APPOINTMENT_SCHEDULED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_NO_SHOW: 'APPOINTMENT_NO_SHOW',
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',
  NOTE_ADDED: 'NOTE_ADDED',
  NOTE_UPDATED: 'NOTE_UPDATED',
  NOTE_DELETED: 'NOTE_DELETED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED'
} as const;

export const TARGET_TYPE = {
  CASE: 'CASE',
  APPOINTMENT: 'APPOINTMENT',
  USER: 'USER',
  FILE: 'FILE',
  NOTE: 'NOTE',
  PAYMENT: 'PAYMENT'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
} as const;

// IMPORTANT: These must match EXACTLY what's in the form
export const SEX_OPTIONS = {
  MALE: 'Male',
  FEMALE: 'Female',
  PREFER_NOT_TO_SAY: 'Prefer not to reply'
} as const;

// Type definitions
export type Role = typeof ROLES[keyof typeof ROLES];
export type CaseStatus = typeof CASE_STATUS[keyof typeof CASE_STATUS];
export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];
export type ActivityType = typeof ACTIVITY_TYPE[keyof typeof ACTIVITY_TYPE];
export type TargetType = typeof TARGET_TYPE[keyof typeof TARGET_TYPE];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type Sex = typeof SEX_OPTIONS[keyof typeof SEX_OPTIONS];

// Helper functions for validation
export const isValidRole = (role: string): role is Role => 
  Object.values(ROLES).includes(role as Role);

export const isValidCaseStatus = (status: string): status is CaseStatus => 
  Object.values(CASE_STATUS).includes(status as CaseStatus);

export const isValidAppointmentStatus = (status: string): status is AppointmentStatus => 
  Object.values(APPOINTMENT_STATUS).includes(status as AppointmentStatus);

export const isValidActivityType = (type: string): type is ActivityType => 
  Object.values(ACTIVITY_TYPE).includes(type as ActivityType);

export const isValidTargetType = (type: string): type is TargetType => 
  Object.values(TARGET_TYPE).includes(type as TargetType);

export const isValidPaymentStatus = (status: string): status is PaymentStatus => 
  Object.values(PAYMENT_STATUS).includes(status as PaymentStatus);

// Fixed validation to accept the actual form values
export const isValidSex = (sex: string): boolean => {
  const validValues = Object.values(SEX_OPTIONS);
  return validValues.includes(sex as Sex);
};