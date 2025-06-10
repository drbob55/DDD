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
