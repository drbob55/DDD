import { IRepository } from './IRepository';
import { User } from '../entities/user/User';
import { Email } from '../value-objects/Email';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: Email): Promise<User | null>;
  findByRole(role: string): Promise<User[]>;
  existsByEmail(email: Email): Promise<boolean>;
}
