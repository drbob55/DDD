import { Appointment } from '@prisma/client';
import { IRepository } from '../base/repository.interface';

export interface IAppointmentRepository extends IRepository<Appointment> {
  // Add basic methods for now
  findByPatient(patientId: string): Promise<Appointment[]>;
  findByCase(caseId: string): Promise<Appointment[]>;
}
