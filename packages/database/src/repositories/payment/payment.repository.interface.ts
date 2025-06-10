import { Payment } from '@prisma/client';
import { IRepository } from '../base/repository.interface';

export interface IPaymentRepository extends IRepository<Payment> {
  findByCase(caseId: string): Promise<Payment[]>;
  findByUser(userId: string): Promise<Payment[]>;
}
