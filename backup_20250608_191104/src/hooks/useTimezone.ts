import { useState, useEffect, useCallback } from 'react';
import { format as dateFnsFormat, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

const TIMEZONE_KEY = 'user_timezone';

export const useTimezone = () => {
  const [timezone, setTimezone] = useState<string>('UTC');
  const [isDetecting, setIsDetecting] = useState(true);

  // Detect user timezone from browser or IP
  const detectTimezone = useCallback(async () => {
    setIsDetecting(true);
    try {
      // First try browser detection
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Optionally verify with IP-based detection
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.timezone) {
          return data.timezone;
        }
      } catch {
        // Fallback to browser timezone if IP detection fails
      }
      
      return browserTimezone;
    } catch {
      return 'UTC';
    } finally {
      setIsDetecting(false);
    }
  }, []);

  // Initialize timezone
  useEffect(() => {
    const stored = localStorage.getItem(TIMEZONE_KEY);
    if (stored) {
      setTimezone(stored);
      setIsDetecting(false);
    } else {
      detectTimezone().then(detected => {
        setTimezone(detected);
        localStorage.setItem(TIMEZONE_KEY, detected);
      });
    }
  }, [detectTimezone]);

  // Update timezone
  const updateTimezone = useCallback((newTimezone: string) => {
    setTimezone(newTimezone);
    localStorage.setItem(TIMEZONE_KEY, newTimezone);
  }, []);

  // Convert UTC to user timezone
  const toUserTimezone = useCallback((date: Date | string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return toZonedTime(dateObj, timezone);
  }, [timezone]);

  // Convert from user timezone to UTC
  // This function assumes the input date represents a time in the user's timezone
  // and converts it to UTC
  const fromUserTimezone = useCallback((date: Date): Date => {
    // Get the year, month, day, hours, minutes from the date object
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    // Create a string representation of the date in the user's timezone
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Parse this as a date in the user's timezone and convert to UTC
    const utcDate = fromZonedTime(new Date(dateStr), timezone);
    
    return utcDate;
  }, [timezone]);

  // Format date in user timezone
  const formatInUserTimezone = useCallback((
    date: Date | string, 
    formatStr: string = 'PPpp'
  ): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, timezone, formatStr);
  }, [timezone]);

  // Get timezone offset
  const getTimezoneOffset = useCallback((): string => {
    const now = new Date();
    const offset = formatInTimeZone(now, timezone, 'XXX'); // e.g., -08:00
    return offset;
  }, [timezone]);

  // Get list of common timezones
  const getCommonTimezones = () => [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Australia/Sydney', label: 'Sydney' }
  ];

  return {
    timezone,
    isDetecting,
    updateTimezone,
    toUserTimezone,
    fromUserTimezone,
    formatInUserTimezone,
    getTimezoneOffset,
    getCommonTimezones,
    detectTimezone
  };
};