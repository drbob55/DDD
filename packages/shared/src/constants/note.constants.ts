// packages/shared/src/constants/note.constants.ts

export const NOTE_CATEGORY = {
  GENERAL: 'GENERAL',
  CLINICAL: 'CLINICAL',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
  FINANCIAL: 'FINANCIAL',
  TECHNICAL: 'TECHNICAL'
} as const;

// Type definitions for this domain
export type NoteCategoryType = typeof NOTE_CATEGORY[keyof typeof NOTE_CATEGORY];

// Validators for this domain
export const noteValidators = {
  isValidNoteCategory: (category: string): category is NoteCategoryType => 
    Object.values(NOTE_CATEGORY).includes(category as any)
};

// Display names for this domain
export const NOTE_DISPLAY_NAMES = {
  category: {
    [NOTE_CATEGORY.GENERAL]: 'General',
    [NOTE_CATEGORY.CLINICAL]: 'Clinical',
    [NOTE_CATEGORY.ADMINISTRATIVE]: 'Administrative',
    [NOTE_CATEGORY.FINANCIAL]: 'Financial',
    [NOTE_CATEGORY.TECHNICAL]: 'Technical'
  }
};