import React from 'react';
import { format, isBefore } from 'date-fns';
import { useTimezone } from '@/hooks';

interface Appointment {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  patientId: string;
  date: string;
  clinic: string;
  clinicName: string;
  reason: string;
  notes?: string;
  status: string;
  dentistName: string;
}

interface AppointmentsProps {
  caseId: string;
  appointments: Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
}

export const Appointments: React.FC<AppointmentsProps> = ({
  caseId,
  appointments,
  onEditAppointment
}) => {
  const { toUserTimezone } = useTimezone();
  
  const caseAppointments = appointments.filter(apt => apt.caseId === caseId);
  const sortedAppointments = [...caseAppointments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const canEditAppointment = (apt: Appointment) => {
    // Can't edit cancelled appointments
    if (apt.status === 'CANCELLED') return false;
    
    // Can't edit past appointments
    const aptDate = new Date(apt.date);
    if (isBefore(aptDate, new Date())) return false;
    
    return true;
  };
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        Appointments
      </h3>
      
      {sortedAppointments.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">
            No appointments scheduled yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map((apt) => {
            const localDate = toUserTimezone(apt.date);
            const isPast = isBefore(new Date(apt.date), new Date());
            
            return (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                localDate={localDate}
                isPast={isPast}
                canEdit={canEditAppointment(apt)}
                onEdit={() => onEditAppointment(apt)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// Appointment Card Component
interface AppointmentCardProps {
  appointment: Appointment;
  localDate: Date;
  isPast: boolean;
  canEdit: boolean;
  onEdit: () => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  localDate,
  isPast,
  canEdit,
  onEdit
}) => {
  const getStatusColor = () => {
    if (appointment.status === 'CANCELLED') return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20';
    if (isPast) return 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50';
    return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800';
  };

  const getStatusBadge = () => {
    if (appointment.status === 'CANCELLED') {
      return (
        <span className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs rounded-full font-medium">
          CANCELLED
        </span>
      );
    }
    if (appointment.status === 'COMPLETED') {
      return (
        <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded-full font-medium">
          COMPLETED
        </span>
      );
    }
    if (isPast) {
      return (
        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
          PAST
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs rounded-full font-medium">
        SCHEDULED
      </span>
    );
  };

  return (
    <div className={`p-4 rounded-lg border transition-all ${getStatusColor()} ${
      !isPast && appointment.status !== 'CANCELLED' ? 'hover:shadow-md' : ''
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <p className={`font-medium ${
              appointment.status === 'CANCELLED' 
                ? 'text-gray-500 dark:text-gray-500 line-through' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {format(localDate, 'EEEE, MMMM d, yyyy')}
            </p>
            {getStatusBadge()}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Time</p>
              <p className="text-gray-700 dark:text-gray-300">
                {format(localDate, 'h:mm a')}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Location</p>
              <p className="text-gray-700 dark:text-gray-300">
                {appointment.clinicName}
              </p>
            </div>
            {appointment.reason && appointment.status !== 'CANCELLED' && (
              <div className="col-span-2">
                <p className="text-gray-500 dark:text-gray-400">Reason</p>
                <p className="text-gray-700 dark:text-gray-300">
                  {appointment.reason}
                </p>
              </div>
            )}
            {appointment.notes && appointment.status !== 'CANCELLED' && (
              <div className="col-span-2">
                <p className="text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {appointment.notes}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {canEdit && (
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium ml-4"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};