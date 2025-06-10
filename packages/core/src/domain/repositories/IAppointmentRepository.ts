import { IRepository } from './IRepository';
import { Appointment } from '../entities/appointment/Appointment';
import { TimeSlot } from '../value-objects/TimeSlot';

export interface IAppointmentRepository extends IRepository<Appointment> {
  findByDentistAndDate(dentistId: string, date: Date): Promise<Appointment[]>;
  findByPatient(patientId: string): Promise<Appointment[]>;
  findConflicting(dentistId: string, timeSlot: TimeSlot): Promise<Appointment[]>;
}
