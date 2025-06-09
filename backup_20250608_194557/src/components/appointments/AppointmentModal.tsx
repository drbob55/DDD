import React, { useState, useEffect } from 'react';
import { useToast, useTimezone } from '@/hooks';
import { Clinic, Appointment, AppointmentStatus } from '@/types/appointment.types';
import { Case, CaseStatus } from '@/types/case.types';
import { format, addDays, setHours, setMinutes, isBefore, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { createDateFromInputs } from '@/utils/dateUtils';
import { appointmentService } from '@/services/appointmentService';



interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData?: Case | null;
  cases?: Case[]; // All available cases for selection
  appointment?: Appointment | null;
  clinics: Clinic[];
  onSubmit: (data: any) => Promise<void>;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  caseData,
  cases = [],
  appointment,
  clinics,
  onSubmit
}) => {
  const { showToast } = useToast();
  const { toUserTimezone, fromUserTimezone } = useTimezone();
  const [submitting, setSubmitting] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    clinicId: '',
    reason: 'Regular Checkup',
    notes: '',
  });

  // Get active cases for selection
  const activeCases = cases.filter(c => !c.archivedByDentist);
  
  // Filter cases based on search
  const filteredCases = activeCases.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      c.patient?.name?.toLowerCase().includes(search) ||
      c.patient?.phone?.toLowerCase().includes(search) ||
      c.caseNumber?.toLowerCase().includes(search) ||
      c.id.toLowerCase().includes(search)
    );
  });

  // Initialize form data
  useEffect(() => {
    if (appointment) {
      // When editing, use the toUserTimezone function from the hook
      const localDate = toUserTimezone(appointment.date);
      
      const clinicId = appointment.clinicId || appointment.clinic || clinics[0]?.id || '';
      
      setFormData({
        date: format(localDate, 'yyyy-MM-dd'),
        time: format(localDate, 'HH:mm'),
        clinicId: clinicId,
        reason: appointment.reason || 'Regular Checkup',
        notes: appointment.notes || '',
      });
      setSelectedCaseId(appointment.caseId);
      setShowCaseSelector(false);
      setCurrentMonth(localDate);
      setSelectedDate(localDate);
    } else {
      // Reset form for new appointment
      setFormData({
        date: '',
        time: '',
        clinicId: clinics[0]?.id || '',
        reason: 'Regular Checkup',
        notes: '',
      });
      setSelectedCaseId(caseData?.id || '');
      setShowCaseSelector(!caseData);
      setCurrentMonth(new Date());
      setSelectedDate(null);
    }
  }, [appointment, caseData, clinics, toUserTimezone, isOpen]);

  // Get selected case details
  const selectedCase = selectedCaseId ? 
    (cases.find(c => c.id === selectedCaseId) || caseData) : 
    caseData;

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validation
  if (!selectedCaseId && !caseData) {
    showToast.error('Please select a case');
    return;
  }

  if (!formData.date || !formData.time || !formData.clinicId) {
    showToast.error('Please fill in all required fields');
    return;
  }

  setSubmitting(true);

  try {
    const finalCaseId = selectedCaseId || caseData?.id;
    const caseDetails = selectedCase || activeCases.find(c => c.id === finalCaseId);
    
    // Create appointment date properly
    const appointmentDate = new Date(`${formData.date}T${formData.time}:00`);
    
    // Validate date
    if (isNaN(appointmentDate.getTime())) {
      throw new Error('Invalid date or time format');
    }

    // Check if appointment is in the past (only for new appointments)
    if (!appointment && appointmentDate < new Date()) {
      throw new Error('Cannot schedule appointments in the past');
    }
    
    const appointmentData = {
      id: appointment?.id,
      caseId: finalCaseId,
      date: appointmentDate.toISOString(),
      clinicId: formData.clinicId,
      clinicName: clinics.find(c => c.id === formData.clinicId)?.name || 'Main Clinic',
      reason: formData.reason,
      notes: formData.notes || '',
      status: appointment?.status || 'SCHEDULED',
      patientId: caseDetails?.patientId || caseDetails?.patient?.id,
      patientName: caseDetails?.patient?.name || caseDetails?.patientName || '',
      dentistId: caseDetails?.dentistId,
      caseNumber: caseDetails?.caseNumber || '',
      duration: 30
    };

    await onSubmit(appointmentData);
    
  } catch (error) {
    console.error('Error in appointment modal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save appointment';
    showToast.error(errorMessage);
  } finally {
    setSubmitting(false);
  }
};
  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setFormData({ ...formData, date: format(date, 'yyyy-MM-dd') });
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setFormData({ ...formData, time });
  };

  // Appointment reasons
  const appointmentReasons = [
    'Follow Up',
    'Regular Checkup',
    'Aligner Fitting',
    'Progress Review',
    'Adjustment',
    'Emergency',
    'Final Review',
    'Other'
  ];

  // Generate calendar days with proper week alignment
  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  };

  // Time slots from 6 AM to 9 PM
  const timeSlots = [];
  for (let hour = 6; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 21 && minute === 30) continue;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeStr);
    }
  }

  // Check if time is in the past
  const isTimePast = (time: string) => {
    if (appointment || !formData.date) return false;
    
    const selectedDate = new Date(formData.date);
    const now = new Date();
    
    if (format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      const [hour, minute] = time.split(':').map(Number);
      return hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes());
    }
    return false;
  };

  // Determine if we should show the form
  const shouldShowForm = (selectedCase || caseData) && !showCaseSelector && (activeCases.length > 0 || appointment);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with higher z-index than CaseDetails */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />
      
      {/* Modal container with higher z-index than CaseDetails */}
      <div className="fixed inset-0 z-[70] overflow-hidden">
        <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold">
                  {appointment ? 'Edit Appointment' : 'Schedule New Appointment'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              {/* Patient Information - Prominent at top */}
              {selectedCase && !showCaseSelector && (
                <div className="px-6 pt-4 pb-3 bg-gray-50 dark:bg-gray-900/50">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {selectedCase.patient?.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {selectedCase.patient?.name || 'Unknown Patient'}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>Case #{selectedCase.caseNumber || selectedCase.id}</span>
                            {selectedCase.patient?.phone && (
                              <>
                                <span>•</span>
                                <span>{selectedCase.patient.phone}</span>
                              </>
                            )}
                            {selectedCase.patient?.email && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[200px]">{selectedCase.patient.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {!appointment && !caseData && (
                        <button
                          type="button"
                          onClick={() => setShowCaseSelector(true)}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Case Selection */}
              {!appointment && !caseData && showCaseSelector && (
                <div className="p-6 pb-0">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                      Select a Patient
                    </h4>
                    
                    {activeCases.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No active cases available
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="relative mb-3">
                          <input
                            type="text"
                            placeholder="Search by patient name, phone, or case number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                          />
                          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {filteredCases.map(caseItem => (
                            <button
                              key={caseItem.id}
                              type="button"
                              onClick={() => {
                                setSelectedCaseId(caseItem.id);
                                setShowCaseSelector(false);
                                setSearchTerm('');
                              }}
                              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                            >
                              <p className="font-medium text-gray-900 dark:text-white">
                                {caseItem.patient?.name || 'Unknown Patient'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Case #{caseItem.caseNumber} • {caseItem.patient?.phone}
                              </p>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Main Content - Scrollable */}
              {shouldShowForm && (
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {/* Calendar and Time Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Calendar */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Select a Date</h4>
                      
                      {/* Month/Year Navigation */}
                      <div className="bg-blue-600 text-white p-2 rounded-t-lg flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                          className="p-0.5 hover:bg-blue-700 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <div className="text-sm font-medium">
                          {format(currentMonth, 'MMMM yyyy')}
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                          className="p-0.5 hover:bg-blue-700 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Calendar Grid */}
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg p-2">
                        <div className="grid grid-cols-7 gap-0.5">
                          {/* Day headers */}
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-500 py-1">
                              {day}
                            </div>
                          ))}
                          
                          {/* Calendar days */}
                          {getCalendarDays().map((date, index) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;
                            const isCurrentMonth = isSameMonth(date, currentMonth);
                            const isTodayDate = isToday(date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const compareDate = new Date(date);
                            compareDate.setHours(0, 0, 0, 0);
                            const isPast = !appointment && compareDate < today;
                            const isDisabled = isPast || !isCurrentMonth;
                            
                            return (
                              <button
                                key={index}
                                type="button"
                                onClick={() => !isDisabled && handleDateSelect(date)}
                                disabled={isDisabled}
                                className={`
                                  p-1.5 rounded text-xs transition-all
                                  ${isSelected 
                                    ? 'bg-blue-600 text-white font-bold' 
                                    : isTodayDate
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : isDisabled
                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }
                                  ${!isCurrentMonth ? 'opacity-40' : ''}
                                `}
                              >
                                {format(date, 'd')}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Date Display */}
                      {selectedDate && (
                        <div className="mt-2 text-center text-xs text-gray-600 dark:text-gray-400">
                          Selected: <span className="font-medium text-gray-900 dark:text-white">
                            {format(selectedDate, 'EEEE, MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Time Selection */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a time'}
                      </h4>
                      
                      {selectedDate ? (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 max-h-[280px] overflow-y-auto">
                          <div className="space-y-1">
                            {timeSlots.map(time => {
                              const isSelected = formData.time === time;
                              const isPast = isTimePast(time);
                              const [hour, minute] = time.split(':');
                              const period = parseInt(hour) >= 12 ? 'PM' : 'AM';
                              const displayHour = parseInt(hour) > 12 ? parseInt(hour) - 12 : (parseInt(hour) === 0 ? 12 : parseInt(hour));
                              const displayTime = `${displayHour}:${minute} ${period}`;
                              
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => !isPast && handleTimeSelect(time)}
                                  disabled={isPast}
                                  className={`
                                    w-full p-2 rounded text-xs font-medium transition-all text-left
                                    ${isSelected 
                                      ? 'bg-blue-600 text-white' 
                                      : isPast
                                      ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                    }
                                  `}
                                >
                                  {displayTime}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Please select a date first
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinic Selection */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Select Clinic</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {clinics.map(clinic => (
                        <button
                          key={clinic.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, clinicId: clinic.id })}
                          className={`
                            p-3 rounded-lg border-2 transition-all text-left
                            ${formData.clinicId === clinic.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                              formData.clinicId === clinic.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                formData.clinicId === clinic.id
                                  ? 'text-blue-900 dark:text-blue-100'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {clinic.name}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Appointment Reason */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Appointment Reason</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {appointmentReasons.map(reason => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setFormData({ ...formData, reason })}
                          className={`
                            px-3 py-1.5 text-xs rounded-full transition-all font-medium
                            ${formData.reason === reason
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-2 py-1.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-xs resize-none"
                      placeholder="Any special instructions..."
                    />
                  </div>
                  
                  {/* Summary */}
                  {formData.date && formData.time && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                      <p className="text-xs text-green-800 dark:text-green-200">
                        <strong>Appointment:</strong> {format(new Date(formData.date), 'EEE, MMM d, yyyy')} at {formData.time}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* No cases message */}
              {!appointment && !caseData && activeCases.length === 0 && !showCaseSelector && (
                <div className="p-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No active cases available for scheduling.
                  </p>
                </div>
              )}

              {/* Actions - Fixed at bottom */}
              <div className="px-6 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                  {(shouldShowForm || (activeCases.length > 0 && !appointment)) && (
                    <button
                      type="submit"
                      disabled={submitting || (!selectedCaseId && !caseData && !appointment) || showCaseSelector || !formData.date || !formData.time || !formData.clinicId}
                      className="px-3 py-1.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                    >
                      {submitting && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      )}
                      {submitting ? 'Saving...' : (appointment ? 'Update' : 'Schedule')}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};