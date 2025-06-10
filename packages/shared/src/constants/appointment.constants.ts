// packages/shared/src/constants/appointment.constants.ts

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'RESCHEDULED'
} as const;

export const APPOINTMENT_TYPE = {
  CONSULTATION: 'CONSULTATION',
  FOLLOW_UP: 'FOLLOW_UP',
  TREATMENT: 'TREATMENT',
  EMERGENCY: 'EMERGENCY',
  SCAN: 'SCAN',
  DELIVERY: 'DELIVERY',
  ADJUSTMENT: 'ADJUSTMENT'
} as const;

// Type definitions for this domain
export type AppointmentStatusType = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];
export type AppointmentTypeType = typeof APPOINTMENT_TYPE[keyof typeof APPOINTMENT_TYPE];

// Status transitions for appointments
export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatusType, AppointmentStatusType[]> = {
  [APPOINTMENT_STATUS.SCHEDULED]: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.RESCHEDULED],
  [APPOINTMENT_STATUS.CONFIRMED]: [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW, APPOINTMENT_STATUS.RESCHEDULED],
  [APPOINTMENT_STATUS.CHECKED_IN]: [APPOINTMENT_STATUS.IN_PROGRESS, APPOINTMENT_STATUS.NO_SHOW],
  [APPOINTMENT_STATUS.IN_PROGRESS]: [APPOINTMENT_STATUS.COMPLETED],
  [APPOINTMENT_STATUS.COMPLETED]: [], // Terminal state
  [APPOINTMENT_STATUS.CANCELLED]: [], // Terminal state
  [APPOINTMENT_STATUS.NO_SHOW]: [], // Terminal state
  [APPOINTMENT_STATUS.RESCHEDULED]: [APPOINTMENT_STATUS.SCHEDULED] // Goes back to scheduled
};

// Validators for this domain
export const appointmentValidators = {
  isValidAppointmentStatus: (status: string): status is AppointmentStatusType => 
    Object.values(APPOINTMENT_STATUS).includes(status as any),
  
  isValidAppointmentType: (type: string): type is AppointmentTypeType => 
    Object.values(APPOINTMENT_TYPE).includes(type as any),
    
  canTransitionTo: (currentStatus: AppointmentStatusType, targetStatus: AppointmentStatusType): boolean => {
    const allowedTransitions = APPOINTMENT_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(targetStatus);
  }
};

// Display names for this domain
export const APPOINTMENT_DISPLAY_NAMES = {
  status: {
    [APPOINTMENT_STATUS.SCHEDULED]: 'Scheduled',
    [APPOINTMENT_STATUS.CONFIRMED]: 'Confirmed',
    [APPOINTMENT_STATUS.CHECKED_IN]: 'Checked In',
    [APPOINTMENT_STATUS.IN_PROGRESS]: 'In Progress',
    [APPOINTMENT_STATUS.COMPLETED]: 'Completed',
    [APPOINTMENT_STATUS.CANCELLED]: 'Cancelled',
    [APPOINTMENT_STATUS.NO_SHOW]: 'No Show',
    [APPOINTMENT_STATUS.RESCHEDULED]: 'Rescheduled'
  },
  type: {
    [APPOINTMENT_TYPE.CONSULTATION]: 'Consultation',
    [APPOINTMENT_TYPE.FOLLOW_UP]: 'Follow-up',
    [APPOINTMENT_TYPE.TREATMENT]: 'Treatment',
    [APPOINTMENT_TYPE.EMERGENCY]: 'Emergency',
    [APPOINTMENT_TYPE.SCAN]: 'Scan',
    [APPOINTMENT_TYPE.DELIVERY]: 'Delivery',
    [APPOINTMENT_TYPE.ADJUSTMENT]: 'Adjustment'
  }
};

// Business rules specific to appointments
export const APPOINTMENT_BUSINESS_RULES = {
  MIN_APPOINTMENT_DURATION: 15,
  MAX_APPOINTMENT_DURATION: 240,
  DEFAULT_APPOINTMENT_DURATION: 30,
  APPOINTMENT_REMINDER_DAYS: 2,
  APPOINTMENT_REMINDER_HOURS: 24,
  MAX_APPOINTMENTS_PER_DAY: 20,
  APPOINTMENT_BUFFER_MINUTES: 15,
  CANCELLATION_WINDOW_HOURS: 24
} as const;