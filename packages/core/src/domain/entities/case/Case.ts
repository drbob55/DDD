import { Entity } from '../Entity';
import { CaseNumber } from '../../value-objects/CaseNumber';
import { CaseStatus } from '../../value-objects/CaseStatus';
import { Result } from '../../../shared/Result';

export interface CaseProps {
  caseNumber: CaseNumber;
  patientId: string;
  dentistId: string;
  reviewerId?: string;
  type: string;
  status: CaseStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  description: string;
  hiddenByDentist: boolean;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCaseProps {
  patientId: string;
  dentistId: string;
  type: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  files?: any[];
}

export class Case extends Entity<CaseProps> {
  get caseNumber(): CaseNumber {
    return this.props.caseNumber;
  }

  get status(): CaseStatus {
    return this.props.status;
  }

  get patientId(): string {
    return this.props.patientId;
  }

  get dentistId(): string {
    return this.props.dentistId;
  }

  private constructor(props: CaseProps, id?: string) {
    super(props, id);
  }

  public static create(props: CreateCaseProps): Result<Case> {
    // Business rule: Description is required and must be at least 10 characters
    if (!props.description || props.description.trim().length < 10) {
      return Result.fail<Case>('Case description must be at least 10 characters');
    }

    // Business rule: Valid case types
    const validTypes = ['ALIGNER', 'BRACES', 'RETAINER', 'CONSULTATION'];
    if (!validTypes.includes(props.type)) {
      return Result.fail<Case>('Invalid case type');
    }

    const caseProps: CaseProps = {
      caseNumber: CaseNumber.generate(),
      patientId: props.patientId,
      dentistId: props.dentistId,
      type: props.type,
      status: CaseStatus.NEW,
      priority: props.priority || 'NORMAL',
      description: props.description,
      hiddenByDentist: false,
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Result.ok<Case>(new Case(caseProps));
  }

  public updateStatus(newStatus: CaseStatus): Result<void> {
    if (!this.props.status.canTransitionTo(newStatus)) {
      return Result.fail<void>(`Cannot transition from ${this.props.status.toString()} to ${newStatus.toString()}`);
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public assignReviewer(reviewerId: string): Result<void> {
    if (this.props.status.value !== 'NEW') {
      return Result.fail<void>('Can only assign reviewer to new cases');
    }

    this.props.reviewerId = reviewerId;
    this.props.status = CaseStatus.IN_REVIEW;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public archive(): void {
    this.props.hiddenByDentist = true;
    this.props.updatedAt = new Date();
  }

  public updatePaymentStatus(status: 'PENDING' | 'PARTIAL' | 'PAID'): void {
    this.props.paymentStatus = status;
    this.props.updatedAt = new Date();
  }
}
