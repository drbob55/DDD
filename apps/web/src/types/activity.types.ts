// types/activity.types.ts
export enum ActivityType {
  CASE_CREATED = 'CASE_CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  APPOINTMENT_COMPLETED = 'APPOINTMENT_COMPLETED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  NOTE_ADDED = 'NOTE_ADDED',
  CASE_ARCHIVED = 'CASE_ARCHIVED'
}

export interface Activity {
  id: string;
  action: ActivityType;
  userId: string;
  userName?: string;
  targetType: 'CASE' | 'APPOINTMENT' | 'FILE';
  targetId: string;
  details: any;
  createdAt: Date;
}