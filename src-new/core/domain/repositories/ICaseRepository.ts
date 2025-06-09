import { IRepository } from './IRepository';
import { Case } from '../entities/case/Case';
import { CaseNumber } from '../value-objects/CaseNumber';
import { CaseStatus } from '../value-objects/CaseStatus';

export interface CaseFilters {
  status?: CaseStatus;
  type?: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ICaseRepository extends IRepository<Case> {
  findByCaseNumber(caseNumber: CaseNumber): Promise<Case | null>;
  findByDentist(dentistId: string, filters?: CaseFilters): Promise<Case[]>;
  findByPatient(patientId: string): Promise<Case[]>;
  findByStatus(status: CaseStatus): Promise<Case[]>;
  countByStatus(status: CaseStatus): Promise<number>;
}
