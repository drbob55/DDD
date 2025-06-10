import { Case } from '@prisma/client';
import { IRepository } from '../base/repository.interface';

export interface ICaseRepository extends IRepository<Case> {
  // Finders
  findByCaseNumber(caseNumber: string): Promise<Case | null>;
  findByPatient(patientId: string): Promise<Case[]>;
  findByDentist(dentistId: string): Promise<Case[]>;
  findByClinic(clinicId: string): Promise<Case[]>;
  findByStatus(status: string | string[]): Promise<Case[]>;
  findByPriority(priority: string): Promise<Case[]>;
  
  // Complex queries
  findActiveCases(): Promise<Case[]>;
  findCasesForReview(): Promise<Case[]>;
  findOverdueCases(): Promise<Case[]>;
  findCasesWithFullDetails(caseId: string): Promise<Case>;
  
  // Business operations
  assignReviewer(caseId: string, reviewerId: string): Promise<Case>;
  assignManufacturer(caseId: string, manufacturerId: string): Promise<Case>;
  updateStatus(caseId: string, status: string): Promise<Case>;
  archiveCase(caseId: string): Promise<Case>;
  unarchiveCase(caseId: string): Promise<Case>;
  
  // Statistics
  countByStatus(dentistId?: string): Promise<Record<string, number>>;
  getAverageProcessingTime(): Promise<number>;
}
