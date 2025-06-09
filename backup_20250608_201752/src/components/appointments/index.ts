// Export all appointment management components
export { AppointmentList } from './AppointmentList';
export { AppointmentScheduler } from './AppointmentScheduler';
export { AppointmentCalendar } from './AppointmentCalendar';
export { default as EnhancedAppointmentsView } from './EnhancedAppointmentsView';
export { 
  AppointmentFilters, 
  AppointmentQuickActions, 
  AppointmentStats 
} from './AppointmentFilters';

// Re-export types
export * from '@/types/appointment.types';