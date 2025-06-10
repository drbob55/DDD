import { IRepository } from './IRepository';
import { Patient } from '../entities/patient/Patient';
import { Email } from '../value-objects/Email';

export interface IPatientRepository extends IRepository<Patient> {
  findByEmail(email: Email): Promise<Patient | null>;
  findByPatientNumber(patientNumber: string): Promise<Patient | null>;
}
