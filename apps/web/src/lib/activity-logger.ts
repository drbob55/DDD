// src/lib/activity-logger.ts
import { prisma } from '@/lib/prisma';

interface LogActivityParams {
  userId?: string;
  action: string;
  targetType?: string;
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
        userId: userId || null,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
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
  targetType?: string;
  targetId?: string;
  action?: string;
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
          email: true,
          firstName: true,
          lastName: true,
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
