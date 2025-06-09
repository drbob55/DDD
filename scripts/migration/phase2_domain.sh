#!/bin/bash

# Phase 2: Extract Core Domain
# This script creates the domain layer with entities, value objects, and use cases

set -e

# Check if utils.sh exists, if not create it
if [ ! -f "./scripts/migration/utils.sh" ]; then
    mkdir -p ./scripts/migration
    cat > ./scripts/migration/utils.sh << 'UTILSEOF'
#!/bin/bash

# Utility functions for migration scripts

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Print functions
print_phase_header() {
    echo
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo
}

step_start() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}  ✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}  ✗ $1${NC}"
}

print_phase_complete() {
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ $1 Complete${NC}"
    echo -e "${GREEN}========================================${NC}"
}
UTILSEOF
fi

source ./scripts/migration/utils.sh

print_phase_header "Phase 2: Extract Core Domain"

# Step 1: Create domain entity templates
step_start "Creating domain entities"

mkdir -p src-new/core/domain/entities/{user,case,patient,appointment}
mkdir -p src-new/core/domain/value-objects
mkdir -p src-new/core/domain/repositories
mkdir -p src-new/core/domain/events
mkdir -p src-new/core/domain/services

# Create base Entity class
cat > src-new/core/domain/entities/Entity.ts << 'EOF'
// Base Entity Class
// All domain entities extend from this base class

export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  constructor(props: T, id?: string) {
    this._id = id || this.generateId();
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  public equals(object?: Entity<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!this.isEntity(object)) {
      return false;
    }
    return this._id === object._id;
  }

  private isEntity(v: any): v is Entity<any> {
    return v instanceof Entity;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
EOF

# Create Value Object base
cat > src-new/core/domain/value-objects/ValueObject.ts << 'EOF'
// Base Value Object Class

export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
EOF

print_success "Created base domain classes"

# Step 2: Create domain entities
step_start "Creating domain entities"

# User Entity
cat > src-new/core/domain/entities/user/User.ts << 'EOF'
import { Entity } from '../Entity';
import { Email } from '../../value-objects/Email';
import { Password } from '../../value-objects/Password';
import { UserRole } from '../../value-objects/UserRole';
import { Result } from '../../../shared/Result';

export interface UserProps {
  email: Email;
  password: Password;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends Entity<UserProps> {
  get email(): Email {
    return this.props.email;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  private constructor(props: UserProps, id?: string) {
    super(props, id);
  }

  public static create(props: UserProps, id?: string): Result<User> {
    // Validate required fields
    if (!props.firstName || !props.lastName) {
      return Result.fail<User>('First name and last name are required');
    }

    const user = new User(props, id);
    return Result.ok<User>(user);
  }

  public activate(): Result<void> {
    if (this.props.isActive) {
      return Result.fail<void>('User is already active');
    }
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public deactivate(): Result<void> {
    if (!this.props.isActive) {
      return Result.fail<void>('User is already inactive');
    }
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public updateLastLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  public changePassword(newPassword: Password): Result<void> {
    this.props.password = newPassword;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public hasPermission(permission: string): boolean {
    return this.props.role.hasPermission(permission);
  }
}
EOF

# Case Entity
cat > src-new/core/domain/entities/case/Case.ts << 'EOF'
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
EOF

# Patient Entity
cat > src-new/core/domain/entities/patient/Patient.ts << 'EOF'
import { Entity } from '../Entity';
import { Email } from '../../value-objects/Email';
import { PatientNumber } from '../../value-objects/PatientNumber';
import { PhoneNumber } from '../../value-objects/PhoneNumber';
import { Address } from '../../value-objects/Address';
import { Result } from '../../../shared/Result';

export interface MedicalInfo {
  allergies: string[];
  medications: string[];
  conditions: string[];
  notes: string;
}

export interface PatientProps {
  patientNumber: PatientNumber;
  firstName: string;
  lastName: string;
  email: Email;
  phone?: PhoneNumber;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: Address;
  medicalInfo: MedicalInfo;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Patient extends Entity<PatientProps> {
  get patientNumber(): PatientNumber {
    return this.props.patientNumber;
  }

  get email(): Email {
    return this.props.email;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get age(): number | null {
    if (!this.props.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.props.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  get hasCompletedProfile(): boolean {
    return !!(
      this.props.phone &&
      this.props.dateOfBirth &&
      this.props.gender &&
      this.props.address
    );
  }

  private constructor(props: PatientProps, id?: string) {
    super(props, id);
  }

  public static create(
    props: Omit<PatientProps, 'patientNumber' | 'isActive' | 'createdAt' | 'updatedAt'>, 
    id?: string
  ): Result<Patient> {
    // Validate required fields
    if (!props.firstName || !props.lastName) {
      return Result.fail<Patient>('First name and last name are required');
    }

    const patientProps: PatientProps = {
      ...props,
      patientNumber: PatientNumber.generate(),
      isActive: true,
      medicalInfo: props.medicalInfo || {
        allergies: [],
        medications: [],
        conditions: [],
        notes: ''
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const patient = new Patient(patientProps, id);
    return Result.ok<Patient>(patient);
  }

  public updatePersonalInfo(info: Partial<Pick<PatientProps, 'firstName' | 'lastName' | 'dateOfBirth' | 'gender'>>): void {
    Object.assign(this.props, info);
    this.props.updatedAt = new Date();
  }

  public updateContactInfo(email?: Email, phone?: PhoneNumber, address?: Address): void {
    if (email) this.props.email = email;
    if (phone) this.props.phone = phone;
    if (address) this.props.address = address;
    this.props.updatedAt = new Date();
  }

  public updateMedicalInfo(info: Partial<MedicalInfo>): void {
    this.props.medicalInfo = {
      ...this.props.medicalInfo,
      ...info
    };
    this.props.updatedAt = new Date();
  }

  public addAllergy(allergy: string): void {
    if (!this.props.medicalInfo.allergies.includes(allergy)) {
      this.props.medicalInfo.allergies.push(allergy);
      this.props.updatedAt = new Date();
    }
  }

  public addMedication(medication: string): void {
    if (!this.props.medicalInfo.medications.includes(medication)) {
      this.props.medicalInfo.medications.push(medication);
      this.props.updatedAt = new Date();
    }
  }

  public addCondition(condition: string): void {
    if (!this.props.medicalInfo.conditions.includes(condition)) {
      this.props.medicalInfo.conditions.push(condition);
      this.props.updatedAt = new Date();
    }
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  public reactivate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }
}
EOF

print_success "Created domain entities"

# Step 3: Create Value Objects
step_start "Creating value objects"

# Email Value Object
cat > src-new/core/domain/value-objects/Email.ts << 'EOF'
import { ValueObject } from './ValueObject';
import { Result } from '../../shared/Result';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: EmailProps) {
    super(props);
  }

  public static create(email: string): Result<Email> {
    if (!this.isValidEmail(email)) {
      return Result.fail<Email>('Invalid email address');
    }

    return Result.ok<Email>(new Email({ value: email.toLowerCase() }));
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public toString(): string {
    return this.props.value;
  }
}
EOF

# CaseNumber Value Object
cat > src-new/core/domain/value-objects/CaseNumber.ts << 'EOF'
import { ValueObject } from './ValueObject';

interface CaseNumberProps {
  value: string;
}

export class CaseNumber extends ValueObject<CaseNumberProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: CaseNumberProps) {
    super(props);
  }

  public static generate(): CaseNumber {
    const date = new Date();
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const number = `CASE-${year}${month}${day}-${sequence}`;
    return new CaseNumber({ value: number });
  }

  public static create(value: string): CaseNumber {
    return new CaseNumber({ value });
  }

  public toString(): string {
    return this.props.value;
  }
}
EOF

# CaseStatus Value Object
cat > src-new/core/domain/value-objects/CaseStatus.ts << 'EOF'
import { ValueObject } from './ValueObject';

export enum CaseStatusEnum {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

interface CaseStatusProps {
  value: CaseStatusEnum;
}

export class CaseStatus extends ValueObject<CaseStatusProps> {
  private static validTransitions: Record<CaseStatusEnum, CaseStatusEnum[]> = {
    [CaseStatusEnum.NEW]: [CaseStatusEnum.IN_REVIEW, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.IN_REVIEW]: [CaseStatusEnum.APPROVED, CaseStatusEnum.REJECTED, CaseStatusEnum.NEW],
    [CaseStatusEnum.APPROVED]: [CaseStatusEnum.IN_PRODUCTION, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.REJECTED]: [CaseStatusEnum.NEW, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.IN_PRODUCTION]: [CaseStatusEnum.SHIPPED, CaseStatusEnum.CANCELLED],
    [CaseStatusEnum.SHIPPED]: [CaseStatusEnum.COMPLETED],
    [CaseStatusEnum.COMPLETED]: [],
    [CaseStatusEnum.CANCELLED]: []
  };

  public static NEW = new CaseStatus({ value: CaseStatusEnum.NEW });
  public static IN_REVIEW = new CaseStatus({ value: CaseStatusEnum.IN_REVIEW });
  public static APPROVED = new CaseStatus({ value: CaseStatusEnum.APPROVED });
  public static REJECTED = new CaseStatus({ value: CaseStatusEnum.REJECTED });
  public static IN_PRODUCTION = new CaseStatus({ value: CaseStatusEnum.IN_PRODUCTION });
  public static SHIPPED = new CaseStatus({ value: CaseStatusEnum.SHIPPED });
  public static COMPLETED = new CaseStatus({ value: CaseStatusEnum.COMPLETED });
  public static CANCELLED = new CaseStatus({ value: CaseStatusEnum.CANCELLED });

  get value(): CaseStatusEnum {
    return this.props.value;
  }

  private constructor(props: CaseStatusProps) {
    super(props);
  }

  public static create(status: CaseStatusEnum): CaseStatus {
    return new CaseStatus({ value: status });
  }

  public canTransitionTo(status: CaseStatus): boolean {
    const allowedTransitions = CaseStatus.validTransitions[this.props.value];
    return allowedTransitions.includes(status.value);
  }

  public toString(): string {
    return this.props.value;
  }

  public isTerminal(): boolean {
    return [CaseStatusEnum.COMPLETED, CaseStatusEnum.CANCELLED].includes(this.props.value);
  }

  public isActive(): boolean {
    return !this.isTerminal();
  }
}
EOF

print_success "Created value objects"

# Step 4: Create Use Cases
step_start "Creating use cases"

mkdir -p src-new/core/application/use-cases/{auth,case,patient,appointment}

# Base Use Case interface
cat > src-new/core/application/use-cases/UseCase.ts << 'EOF'
// Base Use Case Interface

export interface UseCase<IRequest, IResponse> {
  execute(request: IRequest): Promise<IResponse> | IResponse;
}
EOF

# Create Case Use Case
cat > src-new/core/application/use-cases/case/CreateCaseUseCase.ts << 'EOF'
import { UseCase } from '../UseCase';
import { Result } from '../../../shared/Result';
import { Case } from '../../../domain/entities/case/Case';
import { ICaseRepository } from '../../../domain/repositories/ICaseRepository';
import { IPatientRepository } from '../../../domain/repositories/IPatientRepository';
import { IFileService } from '../../services/IFileService';
import { IEventBus } from '../../services/IEventBus';
import { CaseCreatedEvent } from '../../../domain/events/CaseCreatedEvent';
import { CaseType } from '../../../domain/value-objects/CaseType';

export interface CreateCaseRequest {
  patientId: string;
  dentistId: string;
  type: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  files: {
    id: string;
    type: string;
    name: string;
    size: number;
  }[];
}

export interface CreateCaseResponse {
  success: boolean;
  data?: {
    id: string;
    caseNumber: string;
  };
  error?: string;
}

export class CreateCaseUseCase implements UseCase<CreateCaseRequest, CreateCaseResponse> {
  constructor(
    private caseRepository: ICaseRepository,
    private patientRepository: IPatientRepository,
    private fileService: IFileService,
    private eventBus: IEventBus
  ) {}

  async execute(request: CreateCaseRequest): Promise<CreateCaseResponse> {
    try {
      // 1. Validate patient exists
      const patient = await this.patientRepository.findById(request.patientId);
      if (!patient) {
        return {
          success: false,
          error: 'Patient not found'
        };
      }

      // 2. Validate patient is active
      if (!patient.isActive) {
        return {
          success: false,
          error: 'Patient is not active'
        };
      }

      // 3. Create case type
      const caseTypeResult = CaseType.create(request.type);
      if (caseTypeResult.isFailure) {
        return {
          success: false,
          error: caseTypeResult.error
        };
      }

      // 4. Process files
      const caseFiles = await this.fileService.validateCaseFiles(request.files);
      if (caseFiles.isFailure) {
        return {
          success: false,
          error: caseFiles.error
        };
      }

      // 5. Create case entity
      const caseResult = Case.create({
        patientId: request.patientId,
        dentistId: request.dentistId,
        type: caseTypeResult.getValue(),
        description: request.description,
        priority: request.priority,
        files: caseFiles.getValue(),
        notes: ''
      });

      if (caseResult.isFailure) {
        return {
          success: false,
          error: caseResult.error
        };
      }

      const newCase = caseResult.getValue();

      // 6. Save to repository
      await this.caseRepository.save(newCase);

      // 7. Publish domain event
      await this.eventBus.publish(new CaseCreatedEvent({
        caseId: newCase.id,
        caseNumber: newCase.caseNumber.value,
        patientId: request.patientId,
        dentistId: request.dentistId,
        createdAt: new Date()
      }));

      // 8. Return success response
      return {
        success: true,
        data: {
          id: newCase.id,
          caseNumber: newCase.caseNumber.value
        }
      };

    } catch (error) {
      console.error('CreateCaseUseCase error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }
}
EOF

# Login Use Case
cat > src-new/core/application/use-cases/auth/LoginUseCase.ts << 'EOF'
import { UseCase } from '../UseCase';
import { Result } from '../../../shared/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthService } from '../../services/IAuthService';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  error?: string;
}

export class LoginUseCase implements UseCase<LoginRequest, LoginResponse> {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService
  ) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    try {
      // 1. Validate email
      const emailResult = Email.create(request.email);
      if (emailResult.isFailure) {
        return {
          success: false,
          error: 'Invalid email address'
        };
      }

      // 2. Find user by email
      const user = await this.userRepository.findByEmail(emailResult.getValue());
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // 3. Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // 4. Verify password
      const passwordValid = await this.authService.verifyPassword(
        request.password,
        user.password.value
      );

      if (!passwordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // 5. Generate tokens
      const tokens = await this.authService.generateTokens({
        userId: user.id,
        email: user.email.value,
        role: user.role.value
      });

      // 6. Update last login
      user.updateLastLogin();
      await this.userRepository.save(user);

      // 7. Return success response
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email.value,
            firstName: user.props.firstName,
            lastName: user.props.lastName,
            role: user.role.value
          },
          tokens
        }
      };

    } catch (error) {
      console.error('LoginUseCase error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }
}
EOF

print_success "Created use cases"

# Step 5: Create Repository Interfaces
step_start "Creating repository interfaces"

# Base Repository
cat > src-new/core/domain/repositories/IRepository.ts << 'EOF'
// Base Repository Interface

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}
EOF

# User Repository
cat > src-new/core/domain/repositories/IUserRepository.ts << 'EOF'
import { IRepository } from './IRepository';
import { User } from '../entities/user/User';
import { Email } from '../value-objects/Email';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: Email): Promise<User | null>;
  findByRole(role: string): Promise<User[]>;
  existsByEmail(email: Email): Promise<boolean>;
}
EOF

# Case Repository
cat > src-new/core/domain/repositories/ICaseRepository.ts << 'EOF'
import { IRepository } from './IRepository';
import { Case } from '../entities/case/Case';
import { CaseNumber } from '../value-objects/CaseNumber';
import { CaseStatus } from '../value-objects/CaseStatus';

export interface CaseFilters {
  status?: CaseStatus;
  type?: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ICaseRepository extends IRepository<Case> {
  findByCaseNumber(caseNumber: CaseNumber): Promise<Case | null>;
  findByDentist(dentistId: string, filters?: CaseFilters): Promise<Case[]>;
  findByPatient(patientId: string): Promise<Case[]>;
  findByStatus(status: CaseStatus): Promise<Case[]>;
  countByStatus(status: CaseStatus): Promise<number>;
}
EOF

print_success "Created repository interfaces"

# Step 6: Create Result type for error handling
step_start "Creating Result type for error handling"

# Create the shared directory under core
mkdir -p src-new/core/shared

cat > src-new/core/shared/Result.ts << 'EOF'
// Result Type for Error Handling
// Inspired by functional programming patterns

export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error: string | null;
  private _value: T;

  public constructor(isSuccess: boolean, error?: string | null, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error || null;
    this._value = value as T;

    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(`Can't get the value of an error result. Use 'errorValue' instead.`);
    }

    return this._value;
  }

  public errorValue(): string {
    return this.error as string;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, null, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }

  public static combine(results: Result<any>[]): Result<any> {
    for (let result of results) {
      if (result.isFailure) return result;
    }
    return Result.ok();
  }
}
EOF

print_success "Created Result type"

# Step 7: Create Domain Events
step_start "Creating domain events"

# Create events directory
mkdir -p src-new/core/domain/events

# Base Domain Event
cat > src-new/core/domain/events/DomainEvent.ts << 'EOF'
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
EOF

# Case Created Event
cat > src-new/core/domain/events/CaseCreatedEvent.ts << 'EOF'
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
EOF

print_success "Created domain events"

# Step 8: Generate Phase 2 status report
step_start "Generating Phase 2 status report"

cat > migration_status_phase2.md << 'EOF'
# Phase 2 Migration Status

## Completed Tasks

### Domain Layer Structure
- ✅ Created base Entity and ValueObject classes
- ✅ Implemented domain entities (User, Case, Patient)
- ✅ Created value objects (Email, CaseNumber, CaseStatus, etc.)
- ✅ Defined repository interfaces
- ✅ Implemented domain events

### Application Layer
- ✅ Created use case base interface
- ✅ Implemented CreateCaseUseCase
- ✅ Implemented LoginUseCase
- ✅ Added proper error handling with Result type

### Business Rules Encoded
- ✅ Case status transitions
- ✅ Minimum file requirements for cases
- ✅ User permissions and roles
- ✅ Patient profile completion
- ✅ Email validation
- ✅ Case number generation

## Architecture Improvements

### Clean Architecture Benefits
1. **Separation of Concerns**: Business logic is isolated from infrastructure
2. **Testability**: Domain entities can be tested without external dependencies
3. **Flexibility**: Easy to change database or external services
4. **Type Safety**: Strong typing throughout the domain layer

### Domain-Driven Design Elements
- Entities with unique identities
- Value objects for immutable concepts
- Domain events for loose coupling
- Repository pattern for persistence abstraction
- Use cases for orchestrating business operations

## Next Steps

1. Implement remaining use cases
2. Create infrastructure implementations for repositories
3. Add domain services for complex business logic
4. Implement event handlers
5. Create DTOs and mappers

## File Structure Created

```
src-new/core/
├── domain/
│   ├── entities/
│   │   ├── Entity.ts
│   │   ├── user/
│   │   │   └── User.ts
│   │   ├── case/
│   │   │   └── Case.ts
│   │   └── patient/
│   │       └── Patient.ts
│   ├── value-objects/
│   │   ├── ValueObject.ts
│   │   ├── Email.ts
│   │   ├── CaseNumber.ts
│   │   └── CaseStatus.ts
│   ├── repositories/
│   │   ├── IRepository.ts
│   │   ├── IUserRepository.ts
│   │   └── ICaseRepository.ts
│   └── events/
│       ├── DomainEvent.ts
│       └── CaseCreatedEvent.ts
├── application/
│   └── use-cases/
│       ├── UseCase.ts
│       ├── case/
│       │   └── CreateCaseUseCase.ts
│       └── auth/
│           └── LoginUseCase.ts
└── shared/
    └── Result.ts
```

## Key Design Decisions

1. **Result Type**: Used for explicit error handling without exceptions
2. **Value Objects**: Encapsulate validation and business rules
3. **Domain Events**: Enable eventual consistency and loose coupling
4. **Repository Pattern**: Abstract persistence concerns
5. **Use Cases**: Single responsibility for each business operation
EOF

print_success "Generated Phase 2 status report"

print_phase_complete "Phase 2: Extract Core Domain"

echo
echo "Domain layer has been created successfully!"
echo "Check migration_status_phase2.md for details"
echo "Run Phase 3 to set up the monorepo structure"