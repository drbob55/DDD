// packages/shared/src/constants/file.constants.ts

export const FILE_TYPE = {
  UPPER_SCAN: 'UPPER_SCAN',
  LOWER_SCAN: 'LOWER_SCAN',
  BITE_SCAN: 'BITE_SCAN',
  FULL_SCAN: 'FULL_SCAN',
  XRAY: 'XRAY',
  PHOTO: 'PHOTO',
  TREATMENT_PLAN: 'TREATMENT_PLAN',
  CONSENT_FORM: 'CONSENT_FORM',
  PRESCRIPTION: 'PRESCRIPTION',
  INVOICE: 'INVOICE',
  REPORT: 'REPORT',
  OTHER: 'OTHER'
} as const;

export const FILE_MIME_TYPE = {
  STL: 'model/stl',
  OBJ: 'model/obj',
  PLY: 'application/x-ply',
  DICOM: 'application/dicom',
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  ZIP: 'application/zip'
} as const;

export const FILE_EXTENSION = {
  STL: '.stl',
  OBJ: '.obj',
  PLY: '.ply',
  DCM: '.dcm',
  PDF: '.pdf',
  JPEG: '.jpg',
  PNG: '.png',
  DOCX: '.docx',
  DOC: '.doc',
  ZIP: '.zip'
} as const;

export const FILE_CATEGORY = {
  SCAN: 'SCAN',
  DOCUMENT: 'DOCUMENT',
  IMAGE: 'IMAGE',
  MODEL_3D: 'MODEL_3D',
  ARCHIVE: 'ARCHIVE'
} as const;

// Type definitions for this domain
export type FileTypeType = typeof FILE_TYPE[keyof typeof FILE_TYPE];
export type FileMimeTypeType = typeof FILE_MIME_TYPE[keyof typeof FILE_MIME_TYPE];
export type FileExtensionType = typeof FILE_EXTENSION[keyof typeof FILE_EXTENSION];
export type FileCategoryType = typeof FILE_CATEGORY[keyof typeof FILE_CATEGORY];

// Allowed file types configuration
export const ALLOWED_FILE_TYPES = {
  [FILE_TYPE.UPPER_SCAN]: [FILE_MIME_TYPE.STL, FILE_MIME_TYPE.OBJ, FILE_MIME_TYPE.PLY],
  [FILE_TYPE.LOWER_SCAN]: [FILE_MIME_TYPE.STL, FILE_MIME_TYPE.OBJ, FILE_MIME_TYPE.PLY],
  [FILE_TYPE.BITE_SCAN]: [FILE_MIME_TYPE.STL, FILE_MIME_TYPE.OBJ, FILE_MIME_TYPE.PLY],
  [FILE_TYPE.FULL_SCAN]: [FILE_MIME_TYPE.STL, FILE_MIME_TYPE.OBJ, FILE_MIME_TYPE.PLY, FILE_MIME_TYPE.ZIP],
  [FILE_TYPE.XRAY]: [FILE_MIME_TYPE.DICOM, FILE_MIME_TYPE.JPEG, FILE_MIME_TYPE.PNG],
  [FILE_TYPE.PHOTO]: [FILE_MIME_TYPE.JPEG, FILE_MIME_TYPE.PNG],
  [FILE_TYPE.TREATMENT_PLAN]: [FILE_MIME_TYPE.PDF, FILE_MIME_TYPE.DOCX],
  [FILE_TYPE.CONSENT_FORM]: [FILE_MIME_TYPE.PDF, FILE_MIME_TYPE.DOCX, FILE_MIME_TYPE.DOC],
  [FILE_TYPE.PRESCRIPTION]: [FILE_MIME_TYPE.PDF, FILE_MIME_TYPE.DOCX],
  [FILE_TYPE.INVOICE]: [FILE_MIME_TYPE.PDF],
  [FILE_TYPE.REPORT]: [FILE_MIME_TYPE.PDF, FILE_MIME_TYPE.DOCX],
  [FILE_TYPE.OTHER]: Object.values(FILE_MIME_TYPE)
} as const;

// File category mapping
export const FILE_TYPE_CATEGORY_MAP: Record<FileTypeType, FileCategoryType> = {
  [FILE_TYPE.UPPER_SCAN]: FILE_CATEGORY.MODEL_3D,
  [FILE_TYPE.LOWER_SCAN]: FILE_CATEGORY.MODEL_3D,
  [FILE_TYPE.BITE_SCAN]: FILE_CATEGORY.MODEL_3D,
  [FILE_TYPE.FULL_SCAN]: FILE_CATEGORY.MODEL_3D,
  [FILE_TYPE.XRAY]: FILE_CATEGORY.IMAGE,
  [FILE_TYPE.PHOTO]: FILE_CATEGORY.IMAGE,
  [FILE_TYPE.TREATMENT_PLAN]: FILE_CATEGORY.DOCUMENT,
  [FILE_TYPE.CONSENT_FORM]: FILE_CATEGORY.DOCUMENT,
  [FILE_TYPE.PRESCRIPTION]: FILE_CATEGORY.DOCUMENT,
  [FILE_TYPE.INVOICE]: FILE_CATEGORY.DOCUMENT,
  [FILE_TYPE.REPORT]: FILE_CATEGORY.DOCUMENT,
  [FILE_TYPE.OTHER]: FILE_CATEGORY.DOCUMENT
};

// Validators for this domain
export const fileValidators = {
  isValidFileType: (type: string): type is FileTypeType => 
    Object.values(FILE_TYPE).includes(type as any),
  
  isValidMimeType: (mimeType: string): mimeType is FileMimeTypeType => 
    Object.values(FILE_MIME_TYPE).includes(mimeType as any),
    
  isAllowedFileType: (fileType: FileTypeType, mimeType: string): boolean => {
    const allowedTypes = ALLOWED_FILE_TYPES[fileType];
    return allowedTypes.includes(mimeType as any);
  },
  
  getFileCategory: (fileType: FileTypeType): FileCategoryType => {
    return FILE_TYPE_CATEGORY_MAP[fileType];
  }
};

// Display names for this domain
export const FILE_DISPLAY_NAMES = {
  type: {
    [FILE_TYPE.UPPER_SCAN]: 'Upper Scan',
    [FILE_TYPE.LOWER_SCAN]: 'Lower Scan',
    [FILE_TYPE.BITE_SCAN]: 'Bite Scan',
    [FILE_TYPE.FULL_SCAN]: 'Full Scan',
    [FILE_TYPE.XRAY]: 'X-Ray',
    [FILE_TYPE.PHOTO]: 'Photo',
    [FILE_TYPE.TREATMENT_PLAN]: 'Treatment Plan',
    [FILE_TYPE.CONSENT_FORM]: 'Consent Form',
    [FILE_TYPE.PRESCRIPTION]: 'Prescription',
    [FILE_TYPE.INVOICE]: 'Invoice',
    [FILE_TYPE.REPORT]: 'Report',
    [FILE_TYPE.OTHER]: 'Other'
  },
  category: {
    [FILE_CATEGORY.SCAN]: 'Scan',
    [FILE_CATEGORY.DOCUMENT]: 'Document',
    [FILE_CATEGORY.IMAGE]: 'Image',
    [FILE_CATEGORY.MODEL_3D]: '3D Model',
    [FILE_CATEGORY.ARCHIVE]: 'Archive'
  }
};

// Business rules specific to files
export const FILE_BUSINESS_RULES = {
  MAX_FILE_SIZE_MB: 100,
  MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  MIN_CASE_FILES: 3,
  FILE_RETENTION_DAYS: 365,
  THUMBNAIL_SIZE: { width: 200, height: 200 },
  PREVIEW_SIZE: { width: 800, height: 600 },
  CHUNK_SIZE_BYTES: 5 * 1024 * 1024 // 5MB chunks for upload
} as const;