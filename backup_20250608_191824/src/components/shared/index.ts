// src/components/shared/index.ts
// Export all shared components from a single entry point
export { Toast } from './Toast';
export type { ToastProps } from './Toast';

export { LoadingSkeleton, TableSkeleton, CardSkeleton } from './LoadingSkeleton';

export { Pagination, PaginationInfo } from './Pagination';

export { ErrorBoundary, ErrorFallback, useErrorHandler } from './ErrorBoundary';

// Fix the FilePreview export - only import FilePreview, then re-export with alias
export { FilePreview } from './FilePreview';
export { FilePreview as FileUploadPreview } from './FilePreview';

export { VirtualList, useVirtualScroll } from './VirtualList';

export { Modal } from './Modal';

export { ThreeDViewer } from './ThreeDViewer';

// Re-export common types
export interface FileUpload {
  file: File | null;
  preview?: string;
  uploadDate?: Date;
}

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}