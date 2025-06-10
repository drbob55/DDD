// src/components/appointments/AppointmentDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Appointment, AppointmentStatus } from '@dental/shared';
import { useSession } from 'next-auth/react';
import { ROLES } from '@dental/shared';
import { legacyApi } from '@/lib/api-client';

interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (appointment: Appointment) => void;
  onStatusUpdate?: (appointmentId: string, status: AppointmentStatus) => Promise<void>;
  caseId?: string;
}

interface CaseNote {
  id: string;
  content: string;
  category: string;
  appointmentId?: string;
  createdAt: string;
  user: {
    name: string;
    role: string;
  };
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onEdit,
  onStatusUpdate,
  caseId
}) => {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && appointment && caseId) {
      fetchAppointmentNotes();
    }
  }, [isOpen, appointment, caseId]);

  const fetchAppointmentNotes = async () => {
    if (!caseId || !appointment) return;
    
    setLoadingNotes(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/notes`);
      if (response.ok) {
        const data = await response.json();
        // Filter for notes related to this appointment
        const appointmentNotes = data.filter((note: CaseNote) => 
          (note.appointmentId === appointment.id) || 
          (format(new Date(note.createdAt), 'yyyy-MM-dd') === format(new Date(appointment.date), 'yyyy-MM-dd') &&
           (note.category === 'clinical' || note.category === 'appointment'))
        );
        setNotes(appointmentNotes);
      }
    } catch (error) {
      console.error('Error fetching appointment notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!appointment || !onStatusUpdate) return;
    
    setUpdatingStatus(true);
    try {
      await onStatusUpdate(appointment.id, newStatus);
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
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

  if (!isOpen || !appointment) return null;

  const appointmentDate = new Date(appointment.date);
  const isPast = appointmentDate < new Date();
  const canEdit = session?.user?.role === ROLES.ADMIN || session?.user?.role === ROLES.DENTIST;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Appointment Details</h2>
                  <p className="text-blue-100 text-sm">
                    {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Appointment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {format(appointmentDate, 'h:mm a')} ({appointment.duration || 30} minutes)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(appointment.status)}`}>
                    {appointment.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {appointment.type || 'General Appointment'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Clinic</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {appointment.clinicName || 'Main Clinic'}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {appointment.reason && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Reason for Visit</p>
                  <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    {appointment.reason}
                  </p>
                </div>
              )}

              {/* Clinical Notes - Enhanced Version */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Clinical Notes
                    {notes.length > 0 && (
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        ({notes.length} {notes.length === 1 ? 'note' : 'notes'})
                      </span>
                    )}
                  </h3>
                  {canEdit && appointment.status === AppointmentStatus.COMPLETED && (
                    <button
                      onClick={() => {/* Add note handler */}}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Note
                    </button>
                  )}
                </div>

                {loadingNotes ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading notes...</p>
                  </div>
                ) : notes.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {notes.map((note, index) => {
                      const noteDate = new Date(note.createdAt);
                      const isToday = format(noteDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      const categoryColors = {
                        clinical: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
                        appointment: 'border-green-500 bg-green-50 dark:bg-green-900/20',
                        general: 'border-gray-400 bg-gray-50 dark:bg-gray-800',
                      };
                      
                      return (
                        <div 
                          key={note.id} 
                          className={`relative rounded-lg border-l-4 ${categoryColors[note.category as keyof typeof categoryColors] || categoryColors.general} 
                            transition-all hover:shadow-md`}
                        >
                          <div className="p-4">
                            {/* Note Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {/* User Avatar */}
                                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                      {note.user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {note.user.name}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                  {note.user.role.toLowerCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  note.category === 'clinical' 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : note.category === 'appointment'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {note.category}
                                </span>
                              </div>
                            </div>

                            {/* Note Content */}
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {note.content}
                            </div>

                            {/* Note Footer */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                  {isToday 
                                    ? `Today at ${format(noteDate, 'h:mm a')}`
                                    : format(noteDate, 'MMM d, yyyy • h:mm a')
                                  }
                                </span>
                              </div>
                              {note.appointmentId === appointment.id && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  Linked to this appointment
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                      No clinical notes recorded
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">
                      {appointment.status === AppointmentStatus.COMPLETED 
                        ? 'Notes can be added after the appointment'
                        : 'Notes will appear here after the appointment is completed'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    {appointment.status === AppointmentStatus.SCHEDULED && (
                      <>
                        <button
                          onClick={() => handleStatusChange(AppointmentStatus.COMPLETED)}
                          disabled={updatingStatus}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Mark as Completed
                        </button>
                        <button
                          onClick={() => handleStatusChange(AppointmentStatus.NO_SHOW)}
                          disabled={updatingStatus}
                          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          Mark as No Show
                        </button>
                      </>
                    )}
                    {appointment.status === AppointmentStatus.COMPLETED && (
                      <button
                        onClick={() => handleStatusChange(AppointmentStatus.SCHEDULED)}
                        disabled={updatingStatus}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Reopen Appointment
                      </button>
                    )}
                  </div>
                  
                  {onEdit && appointment.status === AppointmentStatus.SCHEDULED && (
                    <button
                      onClick={() => {
                        onEdit(appointment);
                        onClose();
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Edit Appointment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar CSS - Place it here, right before the closing fragment */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a5568;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}</style>
    </>
  );
};