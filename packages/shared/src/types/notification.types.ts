export interface Notification {
  id: string;
  userId: string;
  title?: string | null;
  message: string;
  type: string;
  category?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  read: boolean;
  readAt?: Date | null;
  emailSent: boolean;
  smsSent: boolean;
  metadata?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
}
