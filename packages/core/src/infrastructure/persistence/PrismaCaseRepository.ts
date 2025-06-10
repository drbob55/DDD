import { PrismaClient, Prisma } from '@prisma/client';
import { Case } from '../../domain/entities/case/Case';
import { ICaseRepository, CaseFilters } from '../../domain/repositories/ICaseRepository';
import { CaseNumber } from '../../domain/value-objects/CaseNumber';
import { CaseStatus } from '../../domain/value-objects/CaseStatus';
import { CaseMapper } from '../mappers/CaseMapper';

export class PrismaCaseRepository implements ICaseRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Case | null> {
    const caseData = await this.prisma.case.findUnique({
      where: { id },
      include: {
        patient: true,
        dentist: true,
        files: true,
        reviewer: true,
      },
    });

    return caseData ? CaseMapper.toDomain(caseData) : null;
  }

  async findByCaseNumber(caseNumber: CaseNumber): Promise<Case | null> {
    const caseData = await this.prisma.case.findUnique({
      where: { caseNumber: caseNumber.value },
      include: {
        patient: true,
        dentist: true,
        files: true,
        reviewer: true,
      },
    });

    return caseData ? CaseMapper.toDomain(caseData) : null;
  }

  async findByDentist(dentistId: string, filters?: CaseFilters): Promise<Case[]> {
    const where: Prisma.CaseWhereInput = {
      dentistId,
      ...(filters?.status && { status: filters.status.value }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.startDate && filters?.endDate && {
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      }),
    };

    const cases = await this.prisma.case.findMany({
      where,
      include: {
        patient: true,
        dentist: true,
        files: true,
        reviewer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return cases.map(CaseMapper.toDomain);
  }

  async findByPatient(patientId: string): Promise<Case[]> {
    const cases = await this.prisma.case.findMany({
      where: { patientId },
      include: {
        patient: true,
        dentist: true,
        files: true,
        reviewer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return cases.map(CaseMapper.toDomain);
  }

  async findByStatus(status: CaseStatus): Promise<Case[]> {
    const cases = await this.prisma.case.findMany({
      where: { status: status.value },
      include: {
        patient: true,
        dentist: true,
        files: true,
        reviewer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return cases.map(CaseMapper.toDomain);
  }

  async countByStatus(status: CaseStatus): Promise<number> {
    return this.prisma.case.count({
      where: { status: status.value },
    });
  }

  async save(dentalCase: Case): Promise<void> {
    const data = CaseMapper.toPersistence(dentalCase);

    await this.prisma.case.upsert({
      where: { id: dentalCase.id },
      create: data,
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.case.delete({
      where: { id },
    });
  }
}
