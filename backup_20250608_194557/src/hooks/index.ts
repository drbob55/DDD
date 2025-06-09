// src/hooks/index.ts
// Export all custom hooks from a single entry point

// Toast notifications
export { useToast } from './useToast';
export type { Toast } from './useToast';

// Timezone management
export { useTimezone } from './useTimezone';

// WebSocket connection - Fix: useWebSocket.ts actually exports useDentistData
export { useDentistData as useWebSocket } from './useWebSocket';

// Polling for updates
export { usePolling, useApiPolling } from './usePolling';

// Debouncing
export { useDebounce, useDebouncedCallback, useDebouncedSearch } from './useDebounce';

// Local storage
export { useLocalStorage, useFormDraft } from './useLocalStorage';

// Async operations
export { useAsync, useAsyncQueue, useRetryableAsync } from './useAsync';

// Dentist data management
export { useDentistData } from './useDentistData';

// Case activities hook
export { useCaseActivities } from './useCaseActivities';

// Re-export common types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}