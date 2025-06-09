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
