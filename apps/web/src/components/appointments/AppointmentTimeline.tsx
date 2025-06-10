// src/components/appointments/AppointmentTimeline.tsx
import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Appointment, AppointmentStatus } from '@dental/shared';

interface AppointmentTimelineProps {
  appointments: Appointment[];
  caseId?: string;
  loading?: boolean;
  onViewAppointment?: (appointment: Appointment) => void;
}

export const AppointmentTimeline: React.FC<AppointmentTimelineProps> = ({ 
  appointments = [], 
  caseId,
  loading = false,
  onViewAppointment
}) => {
  const [hoveredAppointment, setHoveredAppointment] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sort appointments by date (newest first)
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Check scroll position and update arrow visibility
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Initial scroll check
  useEffect(() => {
    checkScroll();
    const resizeObserver = new ResizeObserver(checkScroll);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [sortedAppointments]);

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

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

  const handleAppointmentClick = (appointment: Appointment) => {
    if (onViewAppointment) {
      onViewAppointment(appointment);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
      </div>
    );
  }

  if (sortedAppointments.length === 0) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">No appointments scheduled</span>
    );
  }

  return (
    <div className="relative flex items-center group">
      {/* Left Arrow */}
      <button
        onClick={scrollLeft}
        className={`absolute left-0 z-10 p-1 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 transition-opacity ${
          canScrollLeft 
            ? 'opacity-0 group-hover:opacity-100' 
            : 'opacity-0 pointer-events-none'
        }`}
        style={{ boxShadow: 'none' }}
        aria-label="Scroll left"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Timeline Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth px-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sortedAppointments.map((appointment) => {
          const appointmentDate = new Date(appointment.date);
          const dateLabel = format(appointmentDate, 'd MMM').toUpperCase();
          
          return (
            <div key={appointment.id} className="relative flex-shrink-0">
              <div
                className={`relative w-12 h-10 rounded-lg flex flex-col items-center justify-center cursor-pointer ${getStatusColor(appointment.status)} hover:opacity-90 transition-opacity`}
                style={{ boxShadow: 'none' }}
                onClick={() => handleAppointmentClick(appointment)}
                onMouseEnter={() => setHoveredAppointment(appointment.id)}
                onMouseLeave={() => setHoveredAppointment(null)}
              >
                <span className="text-[10px] font-bold leading-none">{dateLabel}</span>
                <span className="text-xs mt-0.5">{getStatusIcon(appointment.status)}</span>
                
                {/* Underline highlight on hover */}
                {hoveredAppointment === appointment.id && (
                  <div 
                    className={`absolute -bottom-1 left-0 right-0 h-0.5 ${getStatusColor(appointment.status)}`} 
                    style={{ boxShadow: 'none' }}
                  />
                )}
              </div>
              
              {/* Simple tooltip on hover */}
              {hoveredAppointment === appointment.id && (
                <div 
                  className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white rounded-lg px-3 py-2 z-50 pointer-events-none whitespace-nowrap"
                  style={{ boxShadow: 'none' }}
                >
                  <div className="text-xs">
                    <p className="font-medium">{format(appointmentDate, 'EEEE, MMMM d')}</p>
                    <p className="text-gray-300">{format(appointmentDate, 'h:mm a')} • {appointment.type || 'Appointment'}</p>
                    {appointment.status === AppointmentStatus.COMPLETED && (
                      <p className="text-green-400 mt-1">Click to view details</p>
                    )}
                    {appointment.status === AppointmentStatus.SCHEDULED && (
                      <p className="text-blue-400 mt-1">Click to view details</p>
                    )}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Arrow */}
      <button
        onClick={scrollRight}
        className={`absolute right-0 z-10 p-1 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 transition-opacity ${
          canScrollRight 
            ? 'opacity-0 group-hover:opacity-100' 
            : 'opacity-0 pointer-events-none'
        }`}
        style={{ boxShadow: 'none' }}
        aria-label="Scroll right"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};