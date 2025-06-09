import { UseCase } from '../UseCase';
import { Result } from '../../../shared/Result';
import { Case } from '../../../domain/entities/case/Case';
import { ICaseRepository } from '../../../domain/repositories/ICaseRepository';
import { IPatientRepository } from '../../../domain/repositories/IPatientRepository';
import { IFileService } from '../../services/IFileService';
import { IEventBus } from '../../services/IEventBus';
import { CaseCreatedEvent } from '../../../domain/events/CaseCreatedEvent';
import { CaseType } from '../../../domain/value-objects/CaseType';

export interface CreateCaseRequest {
  patientId: string;
  dentistId: string;
  type: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  files: {
    id: string;
    type: string;
    name: string;
    size: number;
  }[];
}

export interface CreateCaseResponse {
  success: boolean;
  data?: {
    id: string;
    caseNumber: string;
  };
  error?: string;
}

export class CreateCaseUseCase implements UseCase<CreateCaseRequest, CreateCaseResponse> {
  constructor(
    private caseRepository: ICaseRepository,
    private patientRepository: IPatientRepository,
    private fileService: IFileService,
    private eventBus: IEventBus
  ) {}

  async execute(request: CreateCaseRequest): Promise<CreateCaseResponse> {
    try {
      // 1. Validate patient exists
      const patient = await this.patientRepository.findById(request.patientId);
      if (!patient) {
        return {
          success: false,
          error: 'Patient not found'
        };
      }

      // 2. Validate patient is active
      if (!patient.isActive) {
        return {
          success: false,
          error: 'Patient is not active'
        };
      }

      // 3. Create case type
      const caseTypeResult = CaseType.create(request.type);
      if (caseTypeResult.isFailure) {
        return {
          success: false,
          error: caseTypeResult.error
        };
      }

      // 4. Process files
      const caseFiles = await this.fileService.validateCaseFiles(request.files);
      if (caseFiles.isFailure) {
        return {
          success: false,
          error: caseFiles.error
        };
      }

      // 5. Create case entity
      const caseResult = Case.create({
        patientId: request.patientId,
        dentistId: request.dentistId,
        type: caseTypeResult.getValue(),
        description: request.description,
        priority: request.priority,
        files: caseFiles.getValue(),
        notes: ''
      });

      if (caseResult.isFailure) {
        return {
          success: false,
          error: caseResult.error
        };
      }

      const newCase = caseResult.getValue();

      // 6. Save to repository
      await this.caseRepository.save(newCase);

      // 7. Publish domain event
      await this.eventBus.publish(new CaseCreatedEvent({
        caseId: newCase.id,
        caseNumber: newCase.caseNumber.value,
        patientId: request.patientId,
        dentistId: request.dentistId,
        createdAt: new Date()
      }));

      // 8. Return success response
      return {
        success: true,
        data: {
          id: newCase.id,
          caseNumber: newCase.caseNumber.value
        }
      };

    } catch (error) {
      console.error('CreateCaseUseCase error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }
}
