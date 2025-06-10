export interface Payment {
  id: string;
  userId: string;
  caseId: string;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  transactionId?: string | null;
  gatewayResponse?: string | null;
  description?: string | null;
  notes?: string | null;
  refundedAmount?: number | null;
  refundedAt?: Date | null;
  refundReason?: string | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
