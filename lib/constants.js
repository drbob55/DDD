// lib/constants.ts

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

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
} as const;

export const SEX_OPTIONS = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  PREFER_NOT_TO_SAY: 'PREFER_NOT_TO_SAY'
} as const;

// Type definitions
export type Role = typeof ROLES[keyof typeof ROLES];
export type CaseStatus = typeof CASE_STATUS[keyof typeof CASE_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type Sex = typeof SEX_OPTIONS[keyof typeof SEX_OPTIONS];

// Helper functions for validation
export const isValidRole = (role: string): role is Role => 
  Object.values(ROLES).includes(role as Role);

export const isValidCaseStatus = (status: string): status is CaseStatus => 
  Object.values(CASE_STATUS).includes(status as CaseStatus);

export const isValidPaymentStatus = (status: string): status is PaymentStatus => 
  Object.values(PAYMENT_STATUS).includes(status as PaymentStatus);

export const isValidSex = (sex: string): sex is Sex => 
  Object.values(SEX_OPTIONS).includes(sex as Sex);