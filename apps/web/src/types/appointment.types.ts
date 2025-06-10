// Appointment-related type definitions
export interface Appointment {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  patientId: string;
  date: string;
  clinic: string;
  clinicName: string;
  reason: string;
  treatmentStatus: string;
  patientSince: string;
  notes?: string;
  status: AppointmentStatus;
  dentistName: string;
}

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  dentistId?: string;
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED'
}

export const AppointmentStatusLabels: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'Scheduled',
  [AppointmentStatus.COMPLETED]: 'Completed',
  [AppointmentStatus.CANCELLED]: 'Cancelled',
  [AppointmentStatus.NO_SHOW]: 'No Show',
  [AppointmentStatus.RESCHEDULED]: 'Rescheduled'
};

export const AppointmentStatusColors: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  [AppointmentStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  [AppointmentStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  [AppointmentStatus.NO_SHOW]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  [AppointmentStatus.RESCHEDULED]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
};

export interface AppointmentFormData {
  caseId?: string;
  date: string;
  time: string;
  clinicId: string;
  reason: string;
  notes?: string;
}

export interface ScheduleDate {
  month: string;
  day: string;
  year: string;
}

export const AppointmentReasons = [
  'Follow-up appointment',
  'Initial consultation',
  'Progress check',
  'Final appointment',
  'Emergency',
  'Other'
];

export interface TimeSlot {
  time: string;
  label: string;
  available?: boolean;
}