// packages/shared/src/constants/system.constants.ts

export const DATE_FORMAT = {
  US: 'MM/DD/YYYY',
  EU: 'DD/MM/YYYY',
  ISO: 'YYYY-MM-DD'
} as const;

export const TIME_FORMAT = {
  '12H': '12h',
  '24H': '24h'
} as const;

export const LANGUAGE = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  PT: 'pt'
} as const;

export const TIMEZONE = {
  UTC: 'UTC',
  EST: 'America/New_York',
  CST: 'America/Chicago',
  MST: 'America/Denver',
  PST: 'America/Los_Angeles',
  CET: 'Europe/Paris',
  JST: 'Asia/Tokyo'
  GMT+5: 'Asia/Tashkent',
} as const;

// Type definitions
export type DateFormatType = typeof DATE_FORMAT[keyof typeof DATE_FORMAT];
export type TimeFormatType = typeof TIME_FORMAT[keyof typeof TIME_FORMAT];
export type LanguageType = typeof LANGUAGE[keyof typeof LANGUAGE];
export type TimezoneType = typeof TIMEZONE[keyof typeof TIMEZONE];

// Validators
export const systemValidators = {
  isValidDateFormat: (format: string): format is DateFormatType => 
    Object.values(DATE_FORMAT).includes(format as any),
    
  isValidTimeFormat: (format: string): format is TimeFormatType => 
    Object.values(TIME_FORMAT).includes(format as any),
    
  isValidLanguage: (lang: string): lang is LanguageType => 
    Object.values(LANGUAGE).includes(lang as any),
    
  isValidTimezone: (tz: string): tz is TimezoneType => 
    Object.values(TIMEZONE).includes(tz as any)
};

// Display names
export const SYSTEM_DISPLAY_NAMES = {
  language: {
    [LANGUAGE.EN]: 'English',
    [LANGUAGE.ES]: 'Spanish',
    [LANGUAGE.FR]: 'French',
    [LANGUAGE.DE]: 'German',
    [LANGUAGE.PT]: 'Portuguese'
  },
  timezone: {
    [TIMEZONE.UTC]: 'UTC',
    [TIMEZONE.EST]: 'Eastern Time',
    [TIMEZONE.CST]: 'Central Time',
    [TIMEZONE.MST]: 'Mountain Time',
    [TIMEZONE.PST]: 'Pacific Time',
    [TIMEZONE.CET]: 'Central European Time',
    [TIMEZONE.JST]: 'Japan Standard Time'
  }
};

// System-wide business rules
export const SYSTEM_BUSINESS_RULES = {
  DEFAULT_LANGUAGE: LANGUAGE.EN,
  DEFAULT_TIMEZONE: TIMEZONE.EST,
  DEFAULT_DATE_FORMAT: DATE_FORMAT.US,
  DEFAULT_TIME_FORMAT: TIME_FORMAT['12H'],
  SESSION_TIMEOUT_MINUTES: 30,
  AUTO_SAVE_INTERVAL_SECONDS: 60,
  MAX_EXPORT_ROWS: 10000,
  API_RATE_LIMIT_PER_MINUTE: 60,
  BCRYPT_ROUNDS: 10
} as const;