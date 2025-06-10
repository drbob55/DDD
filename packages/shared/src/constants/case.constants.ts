// packages/shared/src/constants/case.constants.ts

export const CASE_STATUS = {
  NEW: 'NEW',
  PENDING_REVIEW: 'PENDING_REVIEW',
  IN_REVIEW: 'IN_REVIEW',
  AWAITING_CONSENT: 'AWAITING_CONSENT',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  IN_PRODUCTION: 'IN_PRODUCTION',
  MANUFACTURING: 'MANUFACTURING',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED'
} as const;

export const CASE_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const;

export const CASE_TYPE = {
  ALIGNER: 'ALIGNER',
  BRACES: 'BRACES',
  RETAINER: 'RETAINER',
  CONSULTATION: 'CONSULTATION',
  NIGHT_GUARD: 'NIGHT_GUARD',
  SPORTS_GUARD: 'SPORTS_GUARD',
  OTHER: 'OTHER'
} as const;

export const TREATMENT_TYPE = {
  STANDARD: 'STANDARD',
  EXPRESS: 'EXPRESS',
  COMPLEX: 'COMPLEX',
  REVISION: 'REVISION'
} as const;

// Type definitions for this domain
export type CaseStatusType = typeof CASE_STATUS[keyof typeof CASE_STATUS];
export type CasePriorityType = typeof CASE_PRIORITY[keyof typeof CASE_PRIORITY];
export type CaseTypeType = typeof CASE_TYPE[keyof typeof CASE_TYPE];
export type TreatmentTypeType = typeof TREATMENT_TYPE[keyof typeof TREATMENT_TYPE];

// Status transitions for this domain
export const CASE_STATUS_TRANSITIONS: Record<CaseStatusType, CaseStatusType[]> = {
  [CASE_STATUS.NEW]: [CASE_STATUS.PENDING_REVIEW, CASE_STATUS.CANCELLED],
  [CASE_STATUS.PENDING_REVIEW]: [CASE_STATUS.IN_REVIEW, CASE_STATUS.REJECTED, CASE_STATUS.CANCELLED],
  [CASE_STATUS.IN_REVIEW]: [CASE_STATUS.AWAITING_CONSENT, CASE_STATUS.APPROVED, CASE_STATUS.REJECTED, CASE_STATUS.ON_HOLD],
  [CASE_STATUS.AWAITING_CONSENT]: [CASE_STATUS.APPROVED, CASE_STATUS.REJECTED, CASE_STATUS.CANCELLED],
  [CASE_STATUS.APPROVED]: [CASE_STATUS.IN_PRODUCTION, CASE_STATUS.ON_HOLD, CASE_STATUS.CANCELLED],
  [CASE_STATUS.REJECTED]: [CASE_STATUS.PENDING_REVIEW],
  [CASE_STATUS.IN_PRODUCTION]: [CASE_STATUS.MANUFACTURING, CASE_STATUS.ON_HOLD],
  [CASE_STATUS.MANUFACTURING]: [CASE_STATUS.READY_TO_SHIP, CASE_STATUS.ON_HOLD],
  [CASE_STATUS.READY_TO_SHIP]: [CASE_STATUS.SHIPPED],
  [CASE_STATUS.SHIPPED]: [CASE_STATUS.DELIVERED],
  [CASE_STATUS.DELIVERED]: [CASE_STATUS.COMPLETED],
  [CASE_STATUS.COMPLETED]: [],
  [CASE_STATUS.ON_HOLD]: [CASE_STATUS.IN_REVIEW, CASE_STATUS.APPROVED, CASE_STATUS.IN_PRODUCTION, CASE_STATUS.MANUFACTURING, CASE_STATUS.CANCELLED],
  [CASE_STATUS.CANCELLED]: []
};

// Validators for this domain
export const caseValidators = {
  isValidCaseStatus: (status: string): status is CaseStatusType => 
    Object.values(CASE_STATUS).includes(status as any),
  
  isValidCasePriority: (priority: string): priority is CasePriorityType => 
    Object.values(CASE_PRIORITY).includes(priority as any),
  
  isValidCaseType: (type: string): type is CaseTypeType => 
    Object.values(CASE_TYPE).includes(type as any),
    
  isValidTreatmentType: (type: string): type is TreatmentTypeType =>
    Object.values(TREATMENT_TYPE).includes(type as any),
    
  canTransitionTo: (currentStatus: CaseStatusType, targetStatus: CaseStatusType): boolean => {
    const allowedTransitions = CASE_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(targetStatus);
  }
};

// Display names for this domain
export const CASE_DISPLAY_NAMES = {
  status: {
    [CASE_STATUS.NEW]: 'New',
    [CASE_STATUS.PENDING_REVIEW]: 'Pending Review',
    [CASE_STATUS.IN_REVIEW]: 'In Review',
    [CASE_STATUS.AWAITING_CONSENT]: 'Awaiting Consent',
    [CASE_STATUS.APPROVED]: 'Approved',
    [CASE_STATUS.REJECTED]: 'Rejected',
    [CASE_STATUS.IN_PRODUCTION]: 'In Production',
    [CASE_STATUS.MANUFACTURING]: 'Manufacturing',
    [CASE_STATUS.READY_TO_SHIP]: 'Ready to Ship',
    [CASE_STATUS.SHIPPED]: 'Shipped',
    [CASE_STATUS.DELIVERED]: 'Delivered',
    [CASE_STATUS.COMPLETED]: 'Completed',
    [CASE_STATUS.ON_HOLD]: 'On Hold',
    [CASE_STATUS.CANCELLED]: 'Cancelled'
  },
  priority: {
    [CASE_PRIORITY.LOW]: 'Low',
    [CASE_PRIORITY.NORMAL]: 'Normal',
    [CASE_PRIORITY.HIGH]: 'High',
    [CASE_PRIORITY.URGENT]: 'Urgent'
  },
  type: {
    [CASE_TYPE.ALIGNER]: 'Aligner',
    [CASE_TYPE.BRACES]: 'Braces',
    [CASE_TYPE.RETAINER]: 'Retainer',
    [CASE_TYPE.CONSULTATION]: 'Consultation',
    [CASE_TYPE.NIGHT_GUARD]: 'Night Guard',
    [CASE_TYPE.SPORTS_GUARD]: 'Sports Guard',
    [CASE_TYPE.OTHER]: 'Other'
  }
};