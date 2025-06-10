import { BaseRepository } from '../base/repository.base';
import { IPaymentRepository } from './payment.repository.interface';
import { Payment } from '@prisma/client';

export class PaymentRepository extends BaseRepository<Payment> implements IPaymentRepository {
  constructor() {
    super('payment');
  }

  async findByCase(caseId: string): Promise<Payment[]> {
    return this.prismaClient.payment.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByUser(userId: string): Promise<Payment[]> {
    return this.prismaClient.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
