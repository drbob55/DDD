export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED', 
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED'
}

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  SCANNING = 'SCANNING',
  FITTING = 'FITTING',
  ADJUSTMENT = 'ADJUSTMENT',
  FOLLOW_UP = 'FOLLOW_UP',
  CHECKUP = 'CHECKUP',
  EMERGENCY = 'EMERGENCY'
}

export interface Appointment {
  id: string;
  caseId: string;
  userId: string;
  patientId?: string | null;
  patientName?: string | null;
  date: Date;
  duration: number;
  clinicId?: string | null;
  clinicName?: string | null;
  type: string;
  reason?: string | null;
  notes?: string | null;
  status: string;
  
  // Tracking
  confirmedAt?: Date | null;
  checkedInAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  noShowAt?: Date | null;
  
  // Reminders
  reminderSent: boolean;
  reminderSentAt?: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentRequest {
  caseId?: string;
  patientId?: string;
  patientName: string;
  date: Date;
  duration: number;
  clinicId?: string;
  clinicName?: string;
  type: string;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  date?: Date;
  duration?: number;
  type?: string;
  reason?: string;
  notes?: string;
  status?: string;
}