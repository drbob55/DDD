import { Notification } from '@prisma/client';
import { IRepository } from '../base/repository.interface';

export interface INotificationRepository extends IRepository<Notification> {
  findByUser(userId: string): Promise<Notification[]>;
  findUnread(userId: string): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<Notification>;
}
