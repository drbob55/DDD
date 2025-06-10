import { BaseRepository } from '../base/repository.base';
import { IAppointmentRepository } from './appointment.repository.interface';
import { Appointment } from '@prisma/client';

export class AppointmentRepository extends BaseRepository<Appointment> implements IAppointmentRepository {
  constructor() {
    super('appointment');
  }

  async findByPatient(patientId: string): Promise<Appointment[]> {
    return this.prismaClient.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' }
    });
  }

  async findByCase(caseId: string): Promise<Appointment[]> {
    return this.prismaClient.appointment.findMany({
      where: { caseId },
      orderBy: { scheduledAt: 'desc' }
    });
  }
}
