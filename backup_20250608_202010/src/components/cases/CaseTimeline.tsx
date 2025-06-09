// src/components/appointments/AppointmentTimeline.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';

interface AppointmentTimelineProps {
  appointments: Appointment[];
  loading?: boolean;
}

export const AppointmentTimeline: React.FC<AppointmentTimelineProps> = ({ 
  appointments = [], 
  loading = false 
}) => {
  const [hoveredAppointment, setHoveredAppointment] = useState<string | null>(null);

  // Sort appointments by date (newest first)
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'bg-blue-500 text-white';
      case AppointmentStatus.COMPLETED:
        return 'bg-green-500 text-white';
      case AppointmentStatus.CANCELLED:
        return 'bg-red-500 text-white';
      case AppointmentStatus.NO_SHOW:
        return 'bg-orange-500 text-white';
      case AppointmentStatus.RESCHEDULED:
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return '📅';
      case AppointmentStatus.COMPLETED:
        return '✅';
      case AppointmentStatus.CANCELLED:
        return '❌';
      case AppointmentStatus.NO_SHOW:
        return '⚠️';
      case AppointmentStatus.RESCHEDULED:
        return '🔄';
      default:
        return '•';
    }
  };

  const getStatusBorderColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'border-blue-200 dark:border-blue-800';
      case AppointmentStatus.COMPLETED:
        return 'border-green-200 dark:border-green-800';
      case AppointmentStatus.CANCELLED:
        return 'border-red-200 dark:border-red-800';
      case AppointmentStatus.NO_SHOW:
        return 'border-orange-200 dark:border-orange-800';
      case AppointmentStatus.RESCHEDULED:
        return 'border-yellow-200 dark:border-yellow-800';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-10"></div>
        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-10"></div>
        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-10"></div>
      </div>
    );
  }

  if (sortedAppointments.length === 0) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">No appointments scheduled</span>
    );
  }

  // For compact view, show only the most recent 6 appointments
  const displayAppointments = sortedAppointments.slice(0, 6);
  const remainingCount = sortedAppointments.length - displayAppointments.length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {displayAppointments.map((appointment) => {
        const appointmentDate = new Date(appointment.date);
        const dateLabel = format(appointmentDate, 'd MMM').toUpperCase();
        
        return (
          <div key={appointment.id} className="relative flex-shrink-0">
            <div
              className={`relative w-12 h-10 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${getStatusColor(appointment.status)} ${
                hoveredAppointment === appointment.id ? 'scale-110 shadow-lg' : ''
              }`}
              onMouseEnter={() => setHoveredAppointment(appointment.id)}
              onMouseLeave={() => setHoveredAppointment(null)}
            >
              <span className="text-[10px] font-bold leading-none">{dateLabel}</span>
              <span className="text-xs mt-0.5">{getStatusIcon(appointment.status)}</span>
            </div>
            
            {hoveredAppointment === appointment.id && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-xl p-3 z-50 pointer-events-none">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{appointment.type || 'Appointment'}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs space-y-0.5 text-gray-300">
                    <p>📅 {format(appointmentDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p>🕐 {format(appointmentDate, 'h:mm a')}</p>
                    {appointment.clinicName && <p>🏥 {appointment.clinicName}</p>}
                    {appointment.reason && <p>📝 {appointment.reason}</p>}
                  </div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {remainingCount > 0 && (
        <div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

// Full timeline view for detailed appointment history
export const AppointmentTimelineFull: React.FC<AppointmentTimelineProps> = ({ 
  appointments = [], 
  loading = false 
}) => {
  // Sort appointments by date (newest first)
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getStatusBadgeColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case AppointmentStatus.COMPLETED:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case AppointmentStatus.CANCELLED:
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case AppointmentStatus.NO_SHOW:
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
      case AppointmentStatus.RESCHEDULED:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return (
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case AppointmentStatus.COMPLETED:
        return (
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case AppointmentStatus.CANCELLED:
        return (
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case AppointmentStatus.NO_SHOW:
        return (
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case AppointmentStatus.RESCHEDULED:
        return (
          <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (sortedAppointments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No appointments scheduled yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedAppointments.map((appointment, index) => {
        const appointmentDate = new Date(appointment.date);
        const isPast = appointmentDate < new Date();
        
        return (
          <div key={appointment.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              {getStatusIcon(appointment.status)}
              {index < sortedAppointments.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-2"></div>
              )}
            </div>
            
            {/* Appointment content */}
            <div className="flex-1 pb-4">
              <div className={`bg-white dark:bg-gray-800 rounded-lg border ${
                isPast ? 'border-gray-200 dark:border-gray-700' : 'border-blue-200 dark:border-blue-800'
              } p-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(appointment.status)}`}>
                        {appointment.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <p>🕐 {format(appointmentDate, 'h:mm a')} ({appointment.duration || 30} minutes)</p>
                      {appointment.clinicName && <p>🏥 {appointment.clinicName}</p>}
                      {appointment.type && <p>📋 {appointment.type}</p>}
                      {appointment.reason && <p>📝 {appointment.reason}</p>}
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                        "{appointment.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};