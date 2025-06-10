// packages/shared/src/constants/user.constants.ts

export const USER_ROLES = {
  PATIENT: 'PATIENT',
  DENTIST: 'DENTIST',
  REVIEWER: 'REVIEWER',
  MANUFACTURER: 'MANUFACTURER',
  ADMIN: 'ADMIN'
} as const;

export const SEX_OPTIONS = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
  PREFER_NOT_TO_SAY: 'PREFER_NOT_TO_SAY'
} as const;

export const VERIFICATION_METHODS = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  BOTH: 'BOTH'
} as const;

// Type definitions for this domain
export type UserRoleType = typeof USER_ROLES[keyof typeof USER_ROLES];
export type SexOptionType = typeof SEX_OPTIONS[keyof typeof SEX_OPTIONS];
export type VerificationMethodType = typeof VERIFICATION_METHODS[keyof typeof VERIFICATION_METHODS];

// Validators for this domain
export const userValidators = {
  isValidUserRole: (role: string): role is UserRoleType => 
    Object.values(USER_ROLES).includes(role as any),
  
  isValidSexOption: (sex: string): sex is SexOptionType => 
    Object.values(SEX_OPTIONS).includes(sex as any),
    
  isValidVerificationMethod: (method: string): method is VerificationMethodType =>
    Object.values(VERIFICATION_METHODS).includes(method as any)
};

// Display names for this domain
export const USER_DISPLAY_NAMES = {
  roles: {
    [USER_ROLES.PATIENT]: 'Patient',
    [USER_ROLES.DENTIST]: 'Dentist',
    [USER_ROLES.REVIEWER]: 'Reviewer',
    [USER_ROLES.MANUFACTURER]: 'Manufacturer',
    [USER_ROLES.ADMIN]: 'Administrator'
  },
  sex: {
    [SEX_OPTIONS.MALE]: 'Male',
    [SEX_OPTIONS.FEMALE]: 'Female',
    [SEX_OPTIONS.OTHER]: 'Other',
    [SEX_OPTIONS.PREFER_NOT_TO_SAY]: 'Prefer not to say'
  }
};