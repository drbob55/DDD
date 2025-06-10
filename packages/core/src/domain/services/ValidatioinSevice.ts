// packages/core/src/domain/services/ValidationService.ts
import { ROLES, SEX_OPTIONS, CASE_STATUS } from '@dental/shared';

export class ValidationService {
  static validateUserRole(role: string): boolean {
    return Object.values(ROLES).includes(role as any);
  }
  
  static validateSex(sex: string): boolean {
    return Object.values(SEX_OPTIONS).includes(sex as any);
  }
  
  static validateCaseStatus(status: string): boolean {
    return Object.values(CASE_STATUS).includes(status as any);
  }
}