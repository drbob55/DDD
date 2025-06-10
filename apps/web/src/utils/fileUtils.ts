// src/utils/fileUtils.ts

export const ALLOWED_EXTENSIONS = ['.stl', '.obj', '.zip', '.ply'];
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_ADDITIONAL_FILES = 10;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file for upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file extension
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  return { valid: true };
}

/**
 * Validates multiple files for upload
 */
export function validateFiles(files: File[], currentCount: number = 0): {
  validFiles: File[];
  errors: string[];
} {
  const validFiles: File[] = [];
  const errors: string[] = [];

  // Check total count
  if (currentCount + files.length > MAX_ADDITIONAL_FILES) {
    errors.push(`Maximum ${MAX_ADDITIONAL_FILES} additional files allowed. Currently have ${currentCount}.`);
    return { validFiles, errors };
  }

  for (const file of files) {
    const validation = validateFile(file);
    if (validation.valid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${validation.error}`);
    }
  }

  return { validFiles, errors };
}

/**
 * Formats file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Gets file extension icon color and label
 */
export function getFileTypeInfo(extension: string): {
  color: string;
  bgColor: string;
  label: string;
} {
  const ext = extension.toLowerCase();
  
  switch (ext) {
    case 'stl':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        label: 'STL'
      };
    case 'obj':
      return {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: 'OBJ'
      };
    case 'zip':
      return {
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        label: 'ZIP'
      };
    case 'ply':
      return {
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        label: 'PLY'
      };
    default:
      return {
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        label: ext.toUpperCase()
      };
  }
}

/**
 * Normalizes file path for consistent access
 */
export function normalizeFilePath(path: string): string {
  if (!path) return '';
  
  // If already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Remove any double slashes except after protocol
  let normalized = path.replace(/\/+/g, '/');
  
  // Ensure path starts with /uploads/
  if (!normalized.startsWith('/uploads/')) {
    if (normalized.startsWith('uploads/')) {
      normalized = '/' + normalized;
    } else if (normalized.startsWith('/')) {
      normalized = '/uploads' + normalized;
    } else {
      normalized = '/uploads/' + normalized;
    }
  }
  
  return normalized;
}

/**
 * Extracts case number from filename
 */
export function extractCaseNumber(filename: string): string | null {
  // Match pattern: YYMMDD-XXXXXX_
  const match = filename.match(/^(\d{6}-\d+)_/);
  return match ? match[1] : null;
}

/**
 * Generates a unique filename for uploads
 */
export function generateUniqueFilename(
  originalName: string,
  caseNumber: string,
  prefix: string = 'additional'
): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${caseNumber}_${prefix}_${timestamp}_${randomStr}_${sanitizedName}`;
}