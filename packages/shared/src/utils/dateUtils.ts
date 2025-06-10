// src/utils/dateUtils.ts

/**
 * Formats a date for display in the UI
 */
export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formats a date for input fields
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats time for input fields
 */
export const formatTimeForInput = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Creates a date from separate date and time strings
 */
export const createDateFromInputs = (dateStr: string, timeStr: string): Date => {
  const dateTime = new Date(`${dateStr}T${timeStr}:00`);
  
  if (isNaN(dateTime.getTime())) {
    throw new Error('Invalid date or time format');
  }
  
  return dateTime;
};

/**
 * Checks if a date is in the past
 */
export const isDateInPast = (date: Date): boolean => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < now;
};

/**
 * Gets available time slots for appointments
 */
export const getTimeSlots = (
  date: Date, 
  duration: number = 30,
  startHour: number = 8,
  endHour: number = 18
): string[] => {
  const slots: string[] = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += duration) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  
  return slots;
};