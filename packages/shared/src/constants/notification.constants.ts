// packages/shared/src/constants/notification.constants.ts

export const NOTIFICATION_TYPE = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  CASE_UPDATE: 'CASE_UPDATE',
  PAYMENT_DUE: 'PAYMENT_DUE',
  SYSTEM: 'SYSTEM',
  ACCOUNT: 'ACCOUNT',
  SECURITY: 'SECURITY',
  BILLING: 'BILLING',
  APPOINTMENT: 'APPOINTMENT',
  PAYMENT: 'PAYMENT'
} as const;

export const NOTIFICATION_CATEGORY = {
  SYSTEM: 'SYSTEM',
  CASE: 'CASE',
  APPOINTMENT: 'APPOINTMENT',
  PAYMENT: 'PAYMENT',
  BILLING: 'BILLING',
  USER: 'USER',
  ACCOUNT: 'ACCOUNT',
  GENERAL: 'GENERAL'
} as const;

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export const NOTIFICATION_CHANNEL = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSH: 'PUSH'
} as const;

// Type definitions for this domain
export type NotificationTypeType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];
export type NotificationCategoryType = typeof NOTIFICATION_CATEGORY[keyof typeof NOTIFICATION_CATEGORY];
export type NotificationPriorityType = typeof NOTIFICATION_PRIORITY[keyof typeof NOTIFICATION_PRIORITY];
export type NotificationChannelType = typeof NOTIFICATION_CHANNEL[keyof typeof NOTIFICATION_CHANNEL];

// Validators for this domain
export const notificationValidators = {
  isValidNotificationType: (type: string): type is NotificationTypeType => 
    Object.values(NOTIFICATION_TYPE).includes(type as any),
  
  isValidNotificationCategory: (category: string): category is NotificationCategoryType => 
    Object.values(NOTIFICATION_CATEGORY).includes(category as any),
    
  isValidNotificationPriority: (priority: string): priority is NotificationPriorityType =>
    Object.values(NOTIFICATION_PRIORITY).includes(priority as any),
    
  isValidNotificationChannel: (channel: string): channel is NotificationChannelType =>
    Object.values(NOTIFICATION_CHANNEL).includes(channel as any)
};

// Display names for this domain
export const NOTIFICATION_DISPLAY_NAMES = {
  type: {
    [NOTIFICATION_TYPE.INFO]: 'Information',
    [NOTIFICATION_TYPE.SUCCESS]: 'Success',
    [NOTIFICATION_TYPE.WARNING]: 'Warning',
    [NOTIFICATION_TYPE.ERROR]: 'Error',
    [NOTIFICATION_TYPE.APPOINTMENT_REMINDER]: 'Appointment Reminder',
    [NOTIFICATION_TYPE.CASE_UPDATE]: 'Case Update',
    [NOTIFICATION_TYPE.PAYMENT_DUE]: 'Payment Due',
    [NOTIFICATION_TYPE.SYSTEM]: 'System',
    [NOTIFICATION_TYPE.ACCOUNT]: 'Account',
    [NOTIFICATION_TYPE.SECURITY]: 'Security',
    [NOTIFICATION_TYPE.BILLING]: 'Billing',
    [NOTIFICATION_TYPE.APPOINTMENT]: 'Appointment',
    [NOTIFICATION_TYPE.PAYMENT]: 'Payment'
  },
  category: {
    [NOTIFICATION_CATEGORY.SYSTEM]: 'System',
    [NOTIFICATION_CATEGORY.CASE]: 'Case',
    [NOTIFICATION_CATEGORY.APPOINTMENT]: 'Appointment',
    [NOTIFICATION_CATEGORY.PAYMENT]: 'Payment',
    [NOTIFICATION_CATEGORY.BILLING]: 'Billing',
    [NOTIFICATION_CATEGORY.USER]: 'User',
    [NOTIFICATION_CATEGORY.ACCOUNT]: 'Account',
    [NOTIFICATION_CATEGORY.GENERAL]: 'General'
  },
  priority: {
    [NOTIFICATION_PRIORITY.LOW]: 'Low',
    [NOTIFICATION_PRIORITY.MEDIUM]: 'Medium',
    [NOTIFICATION_PRIORITY.HIGH]: 'High',
    [NOTIFICATION_PRIORITY.URGENT]: 'Urgent'
  }
};

// Business rules specific to notifications
export const NOTIFICATION_BUSINESS_RULES = {
  NOTIFICATION_RETENTION_DAYS: 90,
  MAX_UNREAD_NOTIFICATIONS: 100,
  NOTIFICATION_BATCH_SIZE: 50,
  EMAIL_COOLDOWN_MINUTES: 5,
  SMS_COOLDOWN_MINUTES: 10,
  MAX_RETRIES: 3,
  RETRY_DELAY_SECONDS: 300
} as const;