// apps/web/src/components/features/cases/index.ts

// Export all case management components
export { CaseList } from './CaseList';
export { CaseFilters, CaseStats } from './CaseFilters';
export { CaseDetails } from './CaseDetails';
export { NewCaseModal } from './NewCaseModal';
export { CaseNotes } from './CaseNotes';
export { CaseTimeline } from './CaseTimeline';
export { UploadAdditionalFilesModal } from './UploadAdditionalFilesModal';

// Re-export types
export * from '@/types/case.types';