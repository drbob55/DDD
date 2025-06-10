export interface User {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  role: string;
  sex?: string | null;
  dateOfBirth?: Date | null;
  isVerified: boolean;
  profileCompleted: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  caseUpdateAlerts: boolean;
  marketingEmails: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  darkMode: boolean;
  defaultClinicId?: string | null;
  autoArchiveDays: number;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
}
