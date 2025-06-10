import { DomainEvent } from './DomainEvent';

export interface CaseCreatedEventData {
  caseId: string;
  caseNumber: string;
  patientId: string;
  dentistId: string;
  createdAt: Date;
}

export class CaseCreatedEvent extends DomainEvent {
  public readonly data: CaseCreatedEventData;

  constructor(data: CaseCreatedEventData) {
    super(data.caseId);
    this.data = data;
  }

  getEventName(): string {
    return 'CaseCreated';
  }
}
