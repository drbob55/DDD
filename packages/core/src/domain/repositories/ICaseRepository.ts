import { Case } from '../entities/Case'

export interface ICaseRepository {
  findById(id: string): Promise<Case | null>
  findByDentistId(dentistId: string): Promise<Case[]>
  findByPatientId(patientId: string): Promise<Case[]>
  findByStatus(status: string): Promise<Case[]>
  save(caseEntity: Case): Promise<void>
  delete(id: string): Promise<void>
}
