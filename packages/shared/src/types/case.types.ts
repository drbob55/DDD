export interface Case {
  id: string;
  caseNumber: string;
  patientId: string;
  dentistId: string;
  status: string;
  priority: string;
  reviewerId?: string | null;
  reviewedAt?: Date | null;
  manufacturerId?: string | null;
  manufacturingStartedAt?: Date | null;
  
  // Patient snapshot
  patientFirstName: string;
  patientLastName: string;
  patientEmail: string;
  patientPhone?: string | null;
  patientSex: string;
  patientDOB: Date;
  
  // Files
  upperScanFile?: string | null;
  lowerScanFile?: string | null;
  biteScanFile?: string | null;
  treatmentPlanUrl?: string | null;
  scanFileUrl?: string | null;
  
  // Treatment details
  treatmentType: string;
  estimatedWeeks?: number | null;
  actualWeeks?: number | null;
  
  // Consent and timeline
  patientConsented: boolean;
  consentedAt?: Date | null;
  treatmentStartedAt?: Date | null;
  treatmentCompletedAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  
  // Financial
  totalCost?: number | null;
  paidAmount: number;
  paymentStatus: string;
  
  // Other
  notes?: string | null;
  internalNotes?: string | null;
  hiddenByDentist: boolean;
  archivedByDentist: boolean;
  archivedAt?: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseActivity {
  id: string;
  caseId: string;
  userId?: string | null;
  userName: string;
  action: string;
  details?: string | null;
  metadata?: string | null;
  createdAt: Date;
}

export interface CaseNote {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  category: string;
  isInternal: boolean;
  appointmentId?: string | null;
  attachments?: string | null;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date | null;
}
