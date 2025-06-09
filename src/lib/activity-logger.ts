// src/lib/activity-logger.ts
import { prisma } from '@/lib/prisma';
import { ActivityType, TargetType } from '@/lib/constants';

interface LogActivityParams {
  userId: string;
  action: ActivityType;
  targetType: TargetType;
  targetId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity({
  userId,
  action,
  targetType,
  targetId,
  details,
  ipAddress,
  userAgent,
}: LogActivityParams) {
  try {
    await prisma.log.create({
      data: {
        userId,
        action,
        targetType,
        targetId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to prevent disrupting the main operation
  }
}

// Helper function to get formatted activity logs
export async function getActivityLogs(filters: {
  userId?: string;
  targetType?: TargetType;
  targetId?: string;
  action?: ActivityType;
  limit?: number;
  offset?: number;
}) {
  const { userId, targetType, targetId, action, limit = 50, offset = 0 } = filters;

  const where: any = {};
  if (userId) where.userId = userId;
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  if (action) where.action = action;

  const logs = await prisma.log.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return logs.map(log => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));
}