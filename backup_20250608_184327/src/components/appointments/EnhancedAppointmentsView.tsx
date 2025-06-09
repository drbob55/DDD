"use client";

import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { Case } from '@/types/case.types';
import { Clinic } from '@/types/appointment.types';
// import { CaseTimeline } from '@/components/cases/CaseTimeline';
import { format, isSameDay, isToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';

interface EnhancedAppointmentsViewProps {
  appointments: Appointment[];
  cases: Case[];
  clinics: Clinic[];
  loading: boolean;
  onEditAppointment: (appointment: Appointment | null, caseData?: Case) => void;
  onScheduleAppointment: (caseData?: Case) => void;
  onCancelAppointment: (appointmentId: string) => Promise<void>;
  onUpdateAppointmentStatus?: (appointmentId: string, status: AppointmentStatus) => Promise<void>;
  onViewCase: (caseId: string) => void;
  onCompleteAppointment?: (appointmentId: string, notes: string, scheduleFollowUp: boolean) => Promise<void>;
}

export function EnhancedAppointmentsView({
  appointments,
  cases,
  clinics,
  loading,
  onEditAppointment,
  onScheduleAppointment,
  onCancelAppointment,
  onUpdateAppointmentStatus,
  onViewCase,
  onCompleteAppointment
}: EnhancedAppointmentsViewProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'date' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedAppointmentForCompletion, setSelectedAppointmentForCompletion] = useState<Appointment | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [caseNotes, setCaseNotes] = useState<any[]>([]);
  const [caseActivities, setCaseActivities] = useState<any[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [selectedAppointmentForNoteEdit, setSelectedAppointmentForNoteEdit] = useState<Appointment | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [existingNoteId, setExistingNoteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'patient' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterByStatus, setFilterByStatus] = useState<string>('all');
  const [filterByDateRange, setFilterByDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const itemsPerPage = 15;

  // Date helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    
    appointments.forEach(apt => {
      const aptDate = new Date(apt.date);
      const dateKey = format(aptDate, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });
    
    return grouped;
  }, [appointments]);

  // Get appointments for a specific date - INCLUDING ALL STATUSES
  const getAppointmentsForDate = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= startOfDay && aptDate <= endOfDay;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Calculate appointment stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayAppts = getAppointmentsForDate(today);
    const tomorrowAppts = getAppointmentsForDate(tomorrow);
    
    const waitingCount = todayAppts.filter(apt => {
      const aptTime = new Date(apt.date);
      return aptTime <= now && apt.status === AppointmentStatus.SCHEDULED;
    }).length;
    
    const noShowCount = appointments.filter(apt => 
      apt.status === AppointmentStatus.NO_SHOW
    ).length;
    
    return {
      todayQueue: todayAppts.length,
      tomorrowQueue: tomorrowAppts.length,
      waiting: waitingCount,
      noShow: noShowCount,
    };
  }, [appointments]);

  // Get queue appointments based on active tab
  const queueAppointments = useMemo(() => {
    if (activeTab === 'today') {
      return getAppointmentsForDate(today);
    } else if (activeTab === 'tomorrow') {
      return getAppointmentsForDate(tomorrow);
    } else if (activeTab === 'date') {
      return getAppointmentsForDate(selectedDate);
    }
    return [];
  }, [appointments, activeTab, selectedDate]);

  // Generate calendar days
  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  };

  // Get selected appointment and patient details
  const selectedAppointment = useMemo(() => {
    if (!selectedAppointmentId) return null;
    return appointments.find(apt => apt.id === selectedAppointmentId);
  }, [selectedAppointmentId, appointments]);

  // Get selected patient's case
  const selectedCase = useMemo(() => {
    if (!selectedAppointment) return null;
    return cases.find(c => c.id === selectedAppointment.caseId);
  }, [selectedAppointment, cases]);

  // Load case notes and activities when a patient is selected
  React.useEffect(() => {
    if (selectedCase) {
      setLoadingNotes(true);
      // Fetch case notes
      fetch(`/api/cases/${selectedCase.id}/notes`)
        .then(res => res.json())
        .then(data => setCaseNotes(Array.isArray(data) ? data : []))
        .catch(err => console.error('Error loading notes:', err));
      
      // Fetch case activities
      fetch(`/api/cases/${selectedCase.id}/activities`)
        .then(res => res.json())
        .then(data => setCaseActivities(Array.isArray(data) ? data : []))
        .catch(err => console.error('Error loading activities:', err))
        .finally(() => setLoadingNotes(false));
    }
  }, [selectedCase]);

  // Format time display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Calculate wait time
  const calculateWaitTime = (appointmentTime: string) => {
    const now = new Date();
    const aptTime = new Date(appointmentTime);
    const diffMs = now.getTime() - aptTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 0) return 'Not yet';
    if (diffMins === 0) return 'Just arrived';
    if (diffMins < 60) return `${diffMins} mins`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Handle status update
  const handleStatusUpdate = async (appointmentId: string, status: AppointmentStatus, e?: React.MouseEvent) => {
    // Prevent any default behavior or propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (onUpdateAppointmentStatus) {
      try {
        setUpdatingStatus(appointmentId);
        await onUpdateAppointmentStatus(appointmentId, status);
        // Don't navigate or refresh the entire page
        // Just update notes if needed
        if (selectedCase?.id) {
          // Reload case data if needed
          fetch(`/api/cases/${selectedCase.id}/notes`)
            .then(res => res.json())
            .then(data => setCaseNotes(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error reloading notes:', err));
        }
      } catch (error) {
        console.error('Error updating appointment status:', error);
      } finally {
        setUpdatingStatus(null);
      }
    }
  };

  // Handle marking appointment as seen - opens completion modal
  const handleMarkAsSeen = (appointment: Appointment) => {
    setSelectedAppointmentForCompletion(appointment);
    setShowCompletionModal(true);
    setAppointmentNotes('');
    setScheduleFollowUp(false);
  };

  // Handle editing notes for completed appointments
  const handleEditNotes = async (appointment: Appointment) => {
    setSelectedAppointmentForNoteEdit(appointment);
    setShowEditNotesModal(true);
    
    // Find existing note for this appointment
    try {
      const response = await fetch(`/api/cases/${appointment.caseId}/notes`);
      const notes = await response.json();
      const appointmentNote = notes.find((note: any) => 
        note.appointmentId === appointment.id && note.category === 'clinical'
      );
      
      if (appointmentNote) {
        setEditingNoteContent(appointmentNote.content);
        setExistingNoteId(appointmentNote.id);
      } else {
        setEditingNoteContent('');
        setExistingNoteId(null);
      }
    } catch (error) {
      console.error('Error fetching appointment notes:', error);
      setEditingNoteContent('');
      setExistingNoteId(null);
    }
  };

  // Submit edited notes
  const handleSubmitEditedNotes = async () => {
    if (!selectedAppointmentForNoteEdit) return;

    try {
      if (existingNoteId) {
        // Update existing note
        await fetch(`/api/cases/${selectedAppointmentForNoteEdit.caseId}/notes/${existingNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content: editingNoteContent,
          }),
        });
      } else if (editingNoteContent.trim()) {
        // Create new note
        await fetch(`/api/cases/${selectedAppointmentForNoteEdit.caseId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content: editingNoteContent,
            category: 'clinical',
            appointmentId: selectedAppointmentForNoteEdit.id
          }),
        });
      }
      
      setShowEditNotesModal(false);
      setSelectedAppointmentForNoteEdit(null);
      setEditingNoteContent('');
      setExistingNoteId(null);
      
      // Refresh notes if this patient is selected
      if (selectedCase?.id === selectedAppointmentForNoteEdit.caseId) {
        fetch(`/api/cases/${selectedAppointmentForNoteEdit.caseId}/notes`)
          .then(res => res.json())
          .then(data => setCaseNotes(Array.isArray(data) ? data : []))
          .catch(err => console.error('Error reloading notes:', err));
      }
    } catch (error) {
      console.error('Error updating appointment notes:', error);
    }
  };

  // Submit appointment completion with notes
  const handleSubmitAppointmentCompletion = async () => {
    if (!selectedAppointmentForCompletion) return;

    try {
      // Update the appointment status to completed
      await handleStatusUpdate(selectedAppointmentForCompletion.id, AppointmentStatus.COMPLETED);
      
      // Save the appointment notes
      if (appointmentNotes.trim()) {
        await fetch(`/api/cases/${selectedAppointmentForCompletion.caseId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content: appointmentNotes,
            category: 'clinical',
            appointmentId: selectedAppointmentForCompletion.id
          }),
        });
      }
      
      // If scheduling follow-up, trigger the appointment modal
      if (scheduleFollowUp) {
        setShowCompletionModal(false);
        
        // Trigger new appointment with pre-filled notes
        setTimeout(() => {
          const caseData = cases.find(c => c.id === selectedAppointmentForCompletion.caseId);
          if (caseData) {
            // Call onScheduleAppointment with the case data
            onScheduleAppointment(caseData);
          }
        }, 300);
      } else {
        setShowCompletionModal(false);
      }
      
      // Reset state
      setSelectedAppointmentForCompletion(null);
      setAppointmentNotes('');
      setScheduleFollowUp(false);
      
      // Refresh notes if this patient is selected
      if (selectedCase?.id === selectedAppointmentForCompletion.caseId) {
        // Reload notes
        fetch(`/api/cases/${selectedAppointmentForCompletion.caseId}/notes`)
          .then(res => res.json())
          .then(data => setCaseNotes(Array.isArray(data) ? data : []))
          .catch(err => console.error('Error reloading notes:', err));
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };

  // Navigate date
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
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

  // Filter appointments for all view with enhanced filtering
  const filteredAppointments = useMemo(() => {
    let filtered = appointments.filter(apt => 
      !searchQuery || 
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Status filter
    if (filterByStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status === filterByStatus);
    }

    // Date range filter
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    switch (filterByDateRange) {
      case 'today':
        filtered = filtered.filter(apt => {
          const aptDate = new Date(apt.date);
          return aptDate >= startOfDay && aptDate < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(apt => new Date(apt.date) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(apt => new Date(apt.date) >= monthAgo);
        break;
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'patient':
          comparison = a.patientName.localeCompare(b.patientName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [appointments, searchQuery, filterByStatus, filterByDateRange, sortBy, sortOrder]);

  // Paginate appointments
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAppointments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAppointments, currentPage]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const renderQueueView = () => {
    const isTodayTab = activeTab === 'today';
    const currentDate = activeTab === 'today' ? today : 
                       activeTab === 'tomorrow' ? tomorrow : 
                       selectedDate;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Column - Patient Queue */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow-sm h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeTab === 'today' && "Today's Queue"}
                  {activeTab === 'tomorrow' && "Tomorrow's Queue"}
                  {activeTab === 'date' && "Queue for Selected Date"}
                </h3>
                <div className="flex items-center gap-2">
                  {activeTab === 'date' && (
                    <>
                      <button
                        onClick={() => navigateDate('prev')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDatePicker(true)}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {formatDateForDisplay(selectedDate)}
                      </button>
                      <button
                        onClick={() => navigateDate('next')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                  {activeTab !== 'date' && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateForDisplay(currentDate)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Queue List - Now in table format matching All Appointments */}
            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 280px)' }}>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : queueAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">
                    No appointments for {formatDateForDisplay(currentDate)}
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-36">
                        Date & Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                        Case
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {queueAppointments
                      .filter(apt => 
                        !searchQuery || 
                        apt.patientName.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((appointment, index) => {
                        const now = new Date();
                        const aptTime = new Date(appointment.date);
                        const isWaiting = activeTab === 'today' && aptTime <= now && appointment.status === AppointmentStatus.SCHEDULED;
                        const isSelected = selectedAppointmentId === appointment.id;
                        const isPast = aptTime < now;
                        
                        return (
                          <tr
                            key={appointment.id}
                            onClick={() => setSelectedAppointmentId(appointment.id)}
                            className={`cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            } ${isWaiting ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                isWaiting ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                                <span className={`text-sm font-semibold ${
                                  isWaiting ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {index + 1}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {format(aptTime, 'MMM d, yyyy')}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatTime(appointment.date)}
                                  </span>
                                  <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(appointment.status)}`}>
                                    {appointment.status.replace('_', ' ')}
                                  </span>
                                </div>
                                {isWaiting && (
                                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                    Waiting {calculateWaitTime(appointment.date)}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {appointment.patientName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {appointment.patientId}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-sm text-gray-900 dark:text-white">
                                {appointment.caseNumber}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {appointment.reason}
                              </p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-3">
                                {/* Action buttons in order: View, Complete/Edit Notes, Edit, Cancel */}
                                
                                {/* View Case Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewCase(appointment.caseId);
                                  }}
                                  className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                  title="View case"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>

                                {/* Status-specific actions */}
                                {appointment.status === AppointmentStatus.SCHEDULED && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsSeen(appointment);
                                      }}
                                      className="p-1.5 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 rounded"
                                      title="Mark as completed"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditAppointment(appointment);
                                      }}
                                      className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700 rounded"
                                      title="Edit appointment"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  </>
                                )}

                                {appointment.status === AppointmentStatus.COMPLETED && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditNotes(appointment);
                                      }}
                                      className="p-1.5 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-700 rounded"
                                      title="Edit notes"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(appointment.id, AppointmentStatus.SCHEDULED, e);
                                      }}
                                      disabled={updatingStatus === appointment.id}
                                      className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Reopen appointment"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    </button>
                                  </>
                                )}

                                {appointment.status === AppointmentStatus.NO_SHOW && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusUpdate(appointment.id, AppointmentStatus.SCHEDULED, e);
                                    }}
                                    disabled={updatingStatus === appointment.id}
                                    className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Reactivate"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  </button>
                                )}

                                {/* Cancel/Delete button - always last */}
                                {appointment.status !== AppointmentStatus.CANCELLED && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Are you sure you want to delete this appointment?')) {
                                        onCancelAppointment(appointment.id);
                                      }
                                    }}
                                    className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-700 rounded"
                                    title="Delete appointment"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Patient Details with Notes & Timeline */}
        <div className="space-y-6">
          {showDatePicker ? (
            /* Date Picker in Right Panel */
            <div className="bg-white dark:bg-gray-800  shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Select Date
                </h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Month Navigation */}
              <div className="bg-blue-600 text-white p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1 hover:bg-blue-700 rounded transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <h3 className="text-lg font-semibold">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1 hover:bg-blue-700 rounded transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Calendar Grid */}
              <div className="mb-4">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {getCalendarDays().map((date, index) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentMonth = isSameMonth(date, currentMonth);
                    const isTodayDate = isToday(date);
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const dayAppointments = appointmentsByDate[dateKey] || [];
                    const hasAppointments = dayAppointments.length > 0;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (isCurrentMonth) {
                            setSelectedDate(date);
                            setShowDatePicker(false);
                          }
                        }}
                        disabled={!isCurrentMonth}
                        className={`
                          relative p-2 rounded-lg text-sm transition-all
                          ${isSelected 
                            ? 'bg-blue-600 text-white font-bold' 
                            : isTodayDate
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                            : isCurrentMonth
                            ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          }
                        `}
                      >
                        {format(date, 'd')}
                        {hasAppointments && isCurrentMonth && (
                          <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-blue-600 dark:bg-blue-400'
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Quick Navigation */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedDate(today);
                    setShowDatePicker(false);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    setSelectedDate(tomorrow);
                    setShowDatePicker(false);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Tomorrow
                </button>
              </div>
            </div>
          ) : selectedCase ? (
            <>
              {/* Patient Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Patient Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCase.patient?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Patient ID</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCase.patient?.patientId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Contact</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCase.patient?.phone}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCase.patient?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Case Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      selectedCase.status === 'IN_TREATMENT' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : selectedCase.status === 'COMPLETED'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {selectedCase.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => onViewCase(selectedCase.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    View Full Case
                  </button>
                  <button
                    onClick={() => {
                      const apt = appointments.find(a => a.id === selectedAppointmentId);
                      if (apt) onEditAppointment(apt);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Edit Appointment
                  </button>
                </div>
              </div>

              {/* Clinical Notes */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Clinical Notes
                </h3>
                
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : caseNotes.filter(n => n.category === 'clinical').length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No clinical notes yet</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {caseNotes
                      .filter(note => note.category === 'clinical')
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(note => (
                        <div key={note.id} className="border-l-4 border-blue-500 pl-3 py-2">
                          <p className="text-sm text-gray-900 dark:text-white">{note.content}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')} by {note.user?.name || 'Unknown'}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Recent Activity Timeline */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 max-h-80 overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h3>
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : caseActivities.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {caseActivities.slice(0, 5).map((activity, index) => (
                      <div key={activity.id || index} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">{activity.description || activity.action}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {activity.createdAt ? format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a') : ''} 
                            {activity.user?.name ? ` by ${activity.user.name}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">Select a patient to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAllAppointmentsView = () => (
    <div className="">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-4">
            {/* Header with search */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Appointments</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-64"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filters and sorting */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {/* Status filter */}
                <select
                  value={filterByStatus}
                  onChange={(e) => setFilterByStatus(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                >
                  <option value="all">All Statuses</option>
                  <option value={AppointmentStatus.SCHEDULED}>Scheduled</option>
                  <option value={AppointmentStatus.COMPLETED}>Completed</option>
                  <option value={AppointmentStatus.CANCELLED}>Cancelled</option>
                  <option value={AppointmentStatus.NO_SHOW}>No Show</option>
                </select>

                {/* Date range filter */}
                <select
                  value={filterByDateRange}
                  onChange={(e) => setFilterByDateRange(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>

                {/* Sort by */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                >
                  <option value="date">Sort by Date</option>
                  <option value="patient">Sort by Patient</option>
                  <option value="status">Sort by Status</option>
                </select>

                {/* Sort order */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
                >
                  {sortOrder === 'asc' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l5 5m0 0l5-5m-5 5V4" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredAppointments.length} appointments found
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                  Date & Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-44">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                  Case
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                  Clinic
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No appointments found</p>
                      <button
                        onClick={() => onScheduleAppointment()}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Schedule New Appointment
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAppointments.map((appointment, index) => {
                  const aptDate = new Date(appointment.date);
                  const isToday = isSameDay(aptDate, new Date());
                  const isPast = aptDate < new Date();
                  
                  return (
                    <tr 
                      key={appointment.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        isToday ? 'bg-blue-50 dark:bg-blue-900/10' : 
                        isPast ? 'bg-gray-50 dark:bg-gray-900/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {format(aptDate, 'MMM d, yyyy')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatTime(appointment.date)}
                            </span>
                            <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(appointment.status)}`}>
                              {appointment.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
                            {appointment.patientName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {appointment.patientId}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {appointment.caseNumber}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                          {appointment.clinicName || 'Main Clinic'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {appointment.reason}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {appointment.status === AppointmentStatus.SCHEDULED && (
                            <>
                              <button
                                onClick={() => onEditAppointment(appointment)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit appointment"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleMarkAsSeen(appointment)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="Mark as completed"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {appointment.status === AppointmentStatus.COMPLETED && (
                            <>
                              <button
                                onClick={() => handleEditNotes(appointment)}
                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                title="Edit notes"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    await handleStatusUpdate(appointment.id, AppointmentStatus.SCHEDULED, e);
                                  } catch (error) {
                                    console.error('Error reopening appointment:', error);
                                  }
                                }}
                                disabled={updatingStatus === appointment.id}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reopen appointment"
                                type="button"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onViewCase(appointment.caseId)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            title="View case"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {appointment.status !== AppointmentStatus.SCHEDULED && appointment.status !== AppointmentStatus.CANCELLED && appointment.status !== AppointmentStatus.COMPLETED && (
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  await handleStatusUpdate(appointment.id, AppointmentStatus.SCHEDULED, e);
                                } catch (error) {
                                  console.error('Error reactivating appointment:', error);
                                }
                              }}
                              disabled={updatingStatus === appointment.id}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Reactivate"
                              type="button"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                          {appointment.status !== AppointmentStatus.CANCELLED && (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this appointment?')) {
                                  onCancelAppointment(appointment.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete appointment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} of {filteredAppointments.length} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage - 2 + i;
                if (pageNum > 0 && pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('today')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'today'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Today's Queue
            </button>
            <button
              onClick={() => setActiveTab('tomorrow')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tomorrow'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Tomorrow's Queue
            </button>
            <button
              onClick={() => setActiveTab('date')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'date'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Select Date
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              All Appointments
            </button>
          </div>
          
          <button
            onClick={() => onScheduleAppointment()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Appointment
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {activeTab === 'all' ? (
          <div className="h-full overflow-y-auto">
            {renderAllAppointmentsView()}
          </div>
        ) : (
          renderQueueView()
        )}
      </div>

      {/* Appointment Completion Modal */}
      {showCompletionModal && selectedAppointmentForCompletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCompletionModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Complete Appointment
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Patient: <span className="font-medium text-gray-900 dark:text-white">{selectedAppointmentForCompletion.patientName}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Case: <span className="font-medium text-gray-900 dark:text-white">#{selectedAppointmentForCompletion.caseNumber}</span>
              </p>
            </div>

            <div className="space-y-4">
              {/* Appointment Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Clinical Notes & Treatment Performed
                </label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Enter treatment performed, observations, results, and any important notes for future visits..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  These notes will be saved as clinical notes and visible in future appointments
                </p>
              </div>

              {/* Schedule Follow-up */}
              <div className="border-t dark:border-gray-700 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleFollowUp}
                    onChange={(e) => setScheduleFollowUp(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Schedule follow-up appointment
                  </span>
                </label>
                {scheduleFollowUp && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-6">
                    After completing this appointment, you'll be prompted to schedule the follow-up
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAppointmentCompletion}
                disabled={!appointmentNotes.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Complete Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notes Modal */}
      {showEditNotesModal && selectedAppointmentForNoteEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEditNotesModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Clinical Notes
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Patient: <span className="font-medium text-gray-900 dark:text-white">{selectedAppointmentForNoteEdit.patientName}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Case: <span className="font-medium text-gray-900 dark:text-white">#{selectedAppointmentForNoteEdit.caseNumber}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Appointment Date: <span className="font-medium text-gray-900 dark:text-white">
                  {format(new Date(selectedAppointmentForNoteEdit.date), 'MMM d, yyyy h:mm a')}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Clinical Notes
                </label>
                <textarea
                  value={editingNoteContent}
                  onChange={(e) => setEditingNoteContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Enter or update clinical notes..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {existingNoteId ? 'Update the existing clinical notes' : 'Add clinical notes for this completed appointment'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowEditNotesModal(false);
                  setSelectedAppointmentForNoteEdit(null);
                  setEditingNoteContent('');
                  setExistingNoteId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEditedNotes}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {existingNoteId ? 'Update Notes' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}