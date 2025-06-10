import { JobProcessor } from '../JobQueueService';

export interface FileProcessingData {
  fileId: string;
  caseId: string;
  filePath: string;
  mimeType: string;
}

export class FileProcessingJob implements JobProcessor<FileProcessingData> {
  async process(data: FileProcessingData): Promise<void> {
    console.log(`Processing file ${data.fileId} for case ${data.caseId}`);
    // File processing logic here
  }
}
