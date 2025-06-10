import { CaseStatus, CaseType } from '@dental/shared'

export interface CaseProps {
  id: string
  caseNumber: string
  patientId: string
  dentistId: string
  type: CaseType
  status: CaseStatus
  description: string
  createdAt: Date
  updatedAt: Date
}

export class Case {
  private props: CaseProps

  constructor(props: CaseProps) {
    this.props = props
  }

  get id(): string {
    return this.props.id
  }

  get caseNumber(): string {
    return this.props.caseNumber
  }

  get patientId(): string {
    return this.props.patientId
  }

  get dentistId(): string {
    return this.props.dentistId
  }

  get type(): CaseType {
    return this.props.type
  }

  get status(): CaseStatus {
    return this.props.status
  }

  updateStatus(newStatus: CaseStatus): void {
    this.props.status = newStatus
    this.props.updatedAt = new Date()
  }

  static create(props: Omit<CaseProps, 'id' | 'createdAt' | 'updatedAt'>): Case {
    return new Case({
      ...props,
      id: `case_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
}
