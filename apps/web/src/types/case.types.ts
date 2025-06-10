// Case-related type definitions
export interface Patient {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  patient: Patient;
  notes: string;
  createdAt: string;
  scanFileUrl?: string;
  upperScanFile?: string;
  lowerScanFile?: string;
  biteScanFile?: string;
  hiddenByDentist?: boolean;
  archivedByDentist?: boolean;
}

export interface FileUpload {
  file: File | null;
  preview?: string;
  uploadDate?: Date;
}

export interface CaseFormData {
  patientFirstName: string;
  patientLastName: string;
  patientEmail: string;
  phone: string;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  notes: string;
  caseNumber: string;
}

export interface CaseFiles {
  upper: FileUpload;
  lower: FileUpload;
  bite: FileUpload;
  additional: FileUpload[];
}

export enum CaseStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  AWAITING_CONSENT = 'AWAITING_CONSENT',
  IN_TREATMENT = 'IN_TREATMENT',
  MANUFACTURING = 'MANUFACTURING',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export const CaseStatusLabels: Record<CaseStatus, string> = {
  [CaseStatus.PENDING_REVIEW]: 'Pending Review',
  [CaseStatus.AWAITING_CONSENT]: 'Awaiting Consent',
  [CaseStatus.IN_TREATMENT]: 'In Treatment',
  [CaseStatus.MANUFACTURING]: 'Manufacturing',
  [CaseStatus.SHIPPED]: 'Shipped',
  [CaseStatus.COMPLETED]: 'Completed',
  [CaseStatus.REJECTED]: 'Rejected'
};

export const CaseStatusColors: Record<CaseStatus, string> = {
  [CaseStatus.PENDING_REVIEW]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  [CaseStatus.AWAITING_CONSENT]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  [CaseStatus.IN_TREATMENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  [CaseStatus.MANUFACTURING]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  [CaseStatus.SHIPPED]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  [CaseStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  [CaseStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};