// Base Domain Event

export abstract class DomainEvent {
  public dateTimeOccurred: Date;
  public aggregateId: string;

  constructor(aggregateId: string) {
    this.dateTimeOccurred = new Date();
    this.aggregateId = aggregateId;
  }

  abstract getEventName(): string;
}
