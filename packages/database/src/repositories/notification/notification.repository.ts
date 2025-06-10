import { BaseRepository } from '../base/repository.base';
import { INotificationRepository } from './notification.repository.interface';
import { Notification } from '@prisma/client';
import { NotFoundError } from '../../errors';

export class NotificationRepository extends BaseRepository<Notification> implements INotificationRepository {
  constructor() {
    super('notification');
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.prismaClient.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findUnread(userId: string): Promise<Notification[]> {
    return this.prismaClient.notification.findMany({
      where: {
        userId,
        readAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.findById(notificationId);
    if (!notification) throw new NotFoundError('Notification', notificationId);

    return this.prismaClient.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() }
    });
  }
}
