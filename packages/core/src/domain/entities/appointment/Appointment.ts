import { Entity } from '../Entity';
import { Result } from '../../../shared/Result';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface AppointmentProps {
  patientId: string;
  dentistId: string;
  dateTime: Date;
  duration: number; // in minutes
  status: AppointmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Appointment extends Entity<AppointmentProps> {
  private constructor(props: AppointmentProps, id?: string) {
    super(props, id);
  }

  public static create(props: Omit<AppointmentProps, 'status' | 'createdAt' | 'updatedAt'>, id?: string): Result<Appointment> {
    const appointmentProps: AppointmentProps = {
      ...props,
      status: AppointmentStatus.SCHEDULED,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const appointment = new Appointment(appointmentProps, id);
    return Result.ok<Appointment>(appointment);
  }

  get patientId(): string {
    return this.props.patientId;
  }

  get dentistId(): string {
    return this.props.dentistId;
  }

  get dateTime(): Date {
    return this.props.dateTime;
  }

  get status(): AppointmentStatus {
    return this.props.status;
  }

  public cancel(): Result<void> {
    if (this.props.status === AppointmentStatus.COMPLETED) {
      return Result.fail<void>('Cannot cancel completed appointment');
    }
    
    this.props.status = AppointmentStatus.CANCELLED;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public complete(): Result<void> {
    if (this.props.status !== AppointmentStatus.CONFIRMED) {
      return Result.fail<void>('Only confirmed appointments can be completed');
    }
    
    this.props.status = AppointmentStatus.COMPLETED;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }
}
