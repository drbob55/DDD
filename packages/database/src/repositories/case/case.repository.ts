import { BaseRepository } from '../base/repository.base';
import { ICaseRepository } from './case.repository.interface';
import { Case } from '@prisma/client';
import { NotFoundError, BusinessError } from '../../errors';

export class CaseRepository extends BaseRepository<Case> implements ICaseRepository {
  constructor() {
    super('case');
  }

  async findByCaseNumber(caseNumber: string): Promise<Case | null> {
    return this.prismaClient.case.findUnique({
      where: { caseNumber }
    });
  }

  async findByPatient(patientId: string): Promise<Case[]> {
    return this.prismaClient.case.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByDentist(dentistId: string): Promise<Case[]> {
    return this.prismaClient.case.findMany({
      where: { 
        dentistId,
        archivedByDentist: false 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByClinic(clinicId: string): Promise<Case[]> {
    return this.prismaClient.case.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByStatus(status: string | string[]): Promise<Case[]> {
    const statusArray = Array.isArray(status) ? status : [status];
    return this.prismaClient.case.findMany({
      where: { 
        status: { in: statusArray }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByPriority(priority: string): Promise<Case[]> {
    return this.prismaClient.case.findMany({
      where: { priority },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findActiveCases(): Promise<Case[]> {
    return this.prismaClient.case.findMany({
      where: {
        status: {
          notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED']
        },
        archivedByDentist: false
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findCasesForReview(): Promise<Case[]> {
    return this.prismaClient.case.findMany({
      where: {
        status: 'PENDING_REVIEW',
        reviewerId: null
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findOverdueCases(): Promise<Case[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prismaClient.case.findMany({
      where: {
        status: {
          in: ['NEW', 'PENDING_REVIEW', 'IN_PROGRESS']
        },
        createdAt: {
          lt: thirtyDaysAgo
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findCasesWithFullDetails(caseId: string): Promise<Case> {
    const caseData = await this.prismaClient.case.findUnique({
      where: { id: caseId },
      include: {
        patient: true,
        dentist: true,
        reviewer: true,
        manufacturer: true,
        clinic: true,
        files: {
          where: { deletedAt: null },
          orderBy: { uploadedAt: 'desc' }
        },
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        appointments: {
          orderBy: { scheduledAt: 'desc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!caseData) throw new NotFoundError('Case', caseId);
    return caseData;
  }

  async assignReviewer(caseId: string, reviewerId: string): Promise<Case> {
    const caseData = await this.findById(caseId);
    if (!caseData) throw new NotFoundError('Case', caseId);

    if (caseData.reviewerId) {
      throw new BusinessError('Case already has a reviewer assigned');
    }

    return this.prismaClient.case.update({
      where: { id: caseId },
      data: {
        reviewerId,
        reviewStartedAt: new Date()
      }
    });
  }

  async assignManufacturer(caseId: string, manufacturerId: string): Promise<Case> {
    const caseData = await this.findById(caseId);
    if (!caseData) throw new NotFoundError('Case', caseId);

    if (caseData.status !== 'APPROVED') {
      throw new BusinessError('Case must be approved before assigning manufacturer');
    }

    return this.prismaClient.case.update({
      where: { id: caseId },
      data: {
        manufacturerId,
        manufacturingStartedAt: new Date()
      }
    });
  }

  async updateStatus(caseId: string, status: string): Promise<Case> {
    const caseData = await this.findById(caseId);
    if (!caseData) throw new NotFoundError('Case', caseId);

    const updateData: any = { status };

    switch (status) {
      case 'APPROVED':
        updateData.approvedAt = new Date();
        break;
      case 'REJECTED':
        updateData.rejectedAt = new Date();
        break;
      case 'COMPLETED':
        updateData.completedAt = new Date();
        break;
      case 'SHIPPED':
        updateData.shippedAt = new Date();
        break;
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        break;
    }

    return this.prismaClient.case.update({
      where: { id: caseId },
      data: updateData
    });
  }

  async archiveCase(caseId: string): Promise<Case> {
    return this.prismaClient.case.update({
      where: { id: caseId },
      data: {
        archivedByDentist: true,
        archivedAt: new Date()
      }
    });
  }

  async unarchiveCase(caseId: string): Promise<Case> {
    return this.prismaClient.case.update({
      where: { id: caseId },
      data: {
        archivedByDentist: false,
        archivedAt: null
      }
    });
  }

  async countByStatus(dentistId?: string): Promise<Record<string, number>> {
    const where = dentistId ? { dentistId } : {};
    
    const counts = await this.prismaClient.case.groupBy({
      by: ['status'],
      where,
      _count: true
    });

    return counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);
  }

  async getAverageProcessingTime(): Promise<number> {
    const completedCases = await this.prismaClient.case.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    });

    if (completedCases.length === 0) return 0;

    const totalDays = completedCases.reduce((sum, caseData) => {
      const days = Math.floor(
        (caseData.completedAt!.getTime() - caseData.createdAt.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);

    return Math.round(totalDays / completedCases.length);
  }
}
