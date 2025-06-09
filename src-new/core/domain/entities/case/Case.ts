import { Entity } from '../Entity';
import { CaseNumber } from '../../value-objects/CaseNumber';
import { CaseStatus } from '../../value-objects/CaseStatus';
import { CaseType } from '../../value-objects/CaseType';
import { Result } from '../../../shared/Result';
import { CaseFile } from './CaseFile';

export interface CaseProps {
  caseNumber: CaseNumber;
  patientId: string;
  dentistId: string;
  type: CaseType;
  status: CaseStatus;
  description: string;
  files: CaseFile[];
  notes: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  reviewerId?: string;
  reviewedAt?: Date;
  approvedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Case extends Entity<CaseProps> {
  get caseNumber(): CaseNumber {
    return this.props.caseNumber;
  }

  get status(): CaseStatus {
    return this.props.status;
  }

  get type(): CaseType {
    return this.props.type;
  }

  get files(): CaseFile[] {
    return this.props.files;
  }

  get isReviewable(): boolean {
    return this.props.status.canTransitionTo(CaseStatus.IN_REVIEW);
  }

  get isApprovable(): boolean {
    return this.props.status.equals(CaseStatus.IN_REVIEW);
  }

  private constructor(props: CaseProps, id?: string) {
    super(props, id);
  }

  public static create(props: Omit<CaseProps, 'caseNumber' | 'status' | 'createdAt' | 'updatedAt'>, id?: string): Result<Case> {
    // Business rule: Minimum files required
    if (!props.files || props.files.length < 3) {
      return Result.fail<Case>('Minimum 3 files required (upper, lower, bite scans)');
    }

    // Business rule: Must have description
    if (!props.description || props.description.trim().length < 10) {
      return Result.fail<Case>('Case description must be at least 10 characters');
    }

    const caseProps: CaseProps = {
      ...props,
      caseNumber: CaseNumber.generate(),
      status: CaseStatus.NEW,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const dentalCase = new Case(caseProps, id);
    return Result.ok<Case>(dentalCase);
  }

  public updateStatus(newStatus: CaseStatus, userId: string): Result<void> {
    // Check if transition is valid
    if (!this.props.status.canTransitionTo(newStatus)) {
      return Result.fail<void>(`Cannot transition from ${this.props.status.toString()} to ${newStatus.toString()}`);
    }

    // Update status and track who made the change
    this.props.status = newStatus;
    this.props.updatedAt = new Date();

    // Track review/approval timestamps
    if (newStatus.equals(CaseStatus.IN_REVIEW)) {
      this.props.reviewerId = userId;
      this.props.reviewedAt = new Date();
    } else if (newStatus.equals(CaseStatus.APPROVED)) {
      this.props.approvedAt = new Date();
    } else if (newStatus.equals(CaseStatus.COMPLETED)) {
      this.props.completedAt = new Date();
    }

    return Result.ok<void>();
  }

  public addFile(file: CaseFile): Result<void> {
    // Business rule: Check for duplicate files
    const exists = this.props.files.some(f => f.equals(file));
    if (exists) {
      return Result.fail<void>('File already exists in case');
    }

    this.props.files.push(file);
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public removeFile(fileId: string): Result<void> {
    const index = this.props.files.findIndex(f => f.id === fileId);
    if (index === -1) {
      return Result.fail<void>('File not found in case');
    }

    this.props.files.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public addNote(note: string, userId: string): void {
    const timestamp = new Date().toISOString();
    this.props.notes += `\n[${timestamp}] ${userId}: ${note}`;
    this.props.updatedAt = new Date();
  }

  public changePriority(priority: CaseProps['priority']): void {
    this.props.priority = priority;
    this.props.updatedAt = new Date();
  }

  public isOwnedBy(userId: string): boolean {
    return this.props.dentistId === userId;
  }

  public canBeEditedBy(userId: string, userRole: string): boolean {
    // Admins can edit any case
    if (userRole === 'ADMIN') return true;
    
    // Dentists can edit their own cases
    if (userRole === 'DENTIST' && this.isOwnedBy(userId)) return true;
    
    // Reviewers can edit cases in review
    if (userRole === 'REVIEWER' && this.props.status.equals(CaseStatus.IN_REVIEW)) return true;
    
    return false;
  }
}
