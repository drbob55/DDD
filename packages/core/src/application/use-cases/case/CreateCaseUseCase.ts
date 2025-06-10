import { UseCase } from '../UseCase';
import { Result } from '../../../shared/Result';
import { Case } from '../../../domain/entities/case/Case';
import { ICaseRepository } from '../../../domain/repositories/ICaseRepository';

export interface CreateCaseRequest {
  patientId: string;
  dentistId: string;
  type: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  files?: any[];
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
    private fileService: any,
    private activityLogger: any
  ) {}

  async execute(request: CreateCaseRequest): Promise<CreateCaseResponse> {
    try {
      // Create case entity
      const caseResult = Case.create({
        patientId: request.patientId,
        dentistId: request.dentistId,
        type: request.type,
        description: request.description,
        priority: request.priority,
        files: request.files
      });

      if (caseResult.isFailure) {
        return {
          success: false,
          error: caseResult.error
        };
      }

      const newCase = caseResult.getValue();

      // Save to repository
      await this.caseRepository.save(newCase);

      // Process files if any
      if (request.files && request.files.length > 0) {
        await this.fileService.processCaseFiles(newCase.id, request.files);
      }

      // Log activity
      await this.activityLogger.log({
        type: 'CASE_CREATED',
        caseId: newCase.id,
        userId: request.dentistId,
        description: `Case ${newCase.caseNumber.value} created`
      });

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
        error: 'Failed to create case'
      };
    }
  }
}
