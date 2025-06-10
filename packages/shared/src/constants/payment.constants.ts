// packages/shared/src/constants/payment.constants.ts

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE'
} as const;

export const PAYMENT_METHOD = {
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  INSURANCE: 'INSURANCE',
  PAYMENT_PLAN: 'PAYMENT_PLAN',
  OTHER: 'OTHER'
} as const;

export const CURRENCY = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CAD: 'CAD'
} as const;

// Type definitions for this domain
export type PaymentStatusType = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type PaymentMethodType = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];
export type CurrencyType = typeof CURRENCY[keyof typeof CURRENCY];

// Status transitions for payments
export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatusType, PaymentStatusType[]> = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.PROCESSING]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAID]: [PAYMENT_STATUS.REFUNDED],
  [PAYMENT_STATUS.PARTIAL]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.OVERDUE, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING], // Allow retry
  [PAYMENT_STATUS.REFUNDED]: [], // Terminal state
  [PAYMENT_STATUS.CANCELLED]: [], // Terminal state
  [PAYMENT_STATUS.OVERDUE]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIAL, PAYMENT_STATUS.CANCELLED]
};

// Validators for this domain
export const paymentValidators = {
  isValidPaymentStatus: (status: string): status is PaymentStatusType => 
    Object.values(PAYMENT_STATUS).includes(status as any),
  
  isValidPaymentMethod: (method: string): method is PaymentMethodType => 
    Object.values(PAYMENT_METHOD).includes(method as any),
    
  isValidCurrency: (currency: string): currency is CurrencyType =>
    Object.values(CURRENCY).includes(currency as any),
    
  canTransitionTo: (currentStatus: PaymentStatusType, targetStatus: PaymentStatusType): boolean => {
    const allowedTransitions = PAYMENT_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(targetStatus);
  }
};

// Display names for this domain
export const PAYMENT_DISPLAY_NAMES = {
  status: {
    [PAYMENT_STATUS.PENDING]: 'Pending',
    [PAYMENT_STATUS.PROCESSING]: 'Processing',
    [PAYMENT_STATUS.PAID]: 'Paid',
    [PAYMENT_STATUS.PARTIAL]: 'Partially Paid',
    [PAYMENT_STATUS.FAILED]: 'Failed',
    [PAYMENT_STATUS.REFUNDED]: 'Refunded',
    [PAYMENT_STATUS.CANCELLED]: 'Cancelled',
    [PAYMENT_STATUS.OVERDUE]: 'Overdue'
  },
  method: {
    [PAYMENT_METHOD.CREDIT_CARD]: 'Credit Card',
    [PAYMENT_METHOD.DEBIT_CARD]: 'Debit Card',
    [PAYMENT_METHOD.BANK_TRANSFER]: 'Bank Transfer',
    [PAYMENT_METHOD.CASH]: 'Cash',
    [PAYMENT_METHOD.INSURANCE]: 'Insurance',
    [PAYMENT_METHOD.PAYMENT_PLAN]: 'Payment Plan',
    [PAYMENT_METHOD.OTHER]: 'Other'
  },
  currency: {
    [CURRENCY.USD]: 'US Dollar',
    [CURRENCY.EUR]: 'Euro',
    [CURRENCY.UZS]: 'Uzbekistan Som',
  }
};

// Business rules specific to payments
export const PAYMENT_BUSINESS_RULES = {
  DEFAULT_CURRENCY: CURRENCY.USD,
  PAYMENT_OVERDUE_DAYS: 30,
  PARTIAL_PAYMENT_MIN_PERCENTAGE: 20,
  REFUND_WINDOW_DAYS: 30,
  MAX_PAYMENT_AMOUNT: 100000,
  MIN_PAYMENT_AMOUNT: 1,
  PAYMENT_PROCESSING_FEE_PERCENTAGE: 2.9,
  PAYMENT_PROCESSING_FEE_FIXED: 0.30
} as const;