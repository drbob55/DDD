// Common Types

export type ID = string;
export type UUID = string;
export type ISODateString = string;

export interface TimestampedEntity {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };
