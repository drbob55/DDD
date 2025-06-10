"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { useToast, useDentistData } from '@/hooks';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Sidebar } from '@/components/dashboards/dentist/Sidebar';
import { 
  CaseList, 
  CaseFilters, 
  CaseStats, 
  NewCaseModal,
  CaseDetails 
} from '@/components/features/cases';
import { UploadAdditionalFilesModal } from '@/components/features/cases/UploadAdditionalFilesModal';
import { AppointmentModal } from '@/components/features/appointments/AppointmentModal';
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal';
import { EnhancedAppointmentsView } from '@/components/features/appointments/EnhancedAppointmentsView';
import { CaseFormData, CaseFiles } from '@/types/case.types';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { ROLES } from '@dental/shared';

export default function DentistDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  
  // State
  const [currentView, setCurrentView] = useState<'cases' | 'appointments' | 'archive'>('cases');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Get real data with polling enabled
  const {
    cases,
    archivedCases,
    appointments,
    clinics,
    selectedClinic,
    loading: dataLoading,
    error,
    setSelectedClinic,
    archiveCase,
    updateCaseStatus,
    updateAppointmentStatus,
    addClinic,
    deleteClinic,
    refresh
  } = useDentistData({
    userId: session?.user?.id,
    enablePolling: true,
    pollingInterval: 60000 // 60 seconds
  });
  
  // Local state for cases to allow direct updates
  const [localCases, setLocalCases] = useState<any[]>([]);
  
  // Keep local cases in sync with fetched cases
  useEffect(() => {
    setLocalCases(cases);
  }, [cases]);
  
  // Function to update a single case without refreshing everything
  const updateSingleCase = useCallback((updatedCase: any) => {
    setLocalCases(prevCases => 
      prevCases.map(c => c.id === updatedCase.id ? updatedCase : c)
    );
  }, []);

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== ROLES.DENTIST) {
      router.push('/');
    }
  }, [session, status, router]);

  // Handle case submission
  const handleSubmitCase = useCallback(async (formData: CaseFormData, files: CaseFiles) => {
    const formDataToSend = new FormData();
    
    // Add patient info
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, value);
    });
    
    // Add files
    if (files.upper.file) formDataToSend.append('upper', files.upper.file);
    if (files.lower.file) formDataToSend.append('lower', files.lower.file);
    if (files.bite.file) formDataToSend.append('bite', files.bite.file);
    
    files.additional.forEach((fileObj, index) => {
      if (fileObj.file) {
        formDataToSend.append(`additional_${index}`, fileObj.file);
      }
    });

    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit case';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            if (errorText && !errorText.includes('<!DOCTYPE')) {
              errorMessage = errorText;
            }
          } catch (textError) {
            console.error('Could not parse error response');
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      showToast.success(`Case ${result.caseNumber} submitted successfully!`);
      refresh();
      setShowNewCaseModal(false);
      return result;
    } catch (error) {
      console.error('Case submission error:', error);
      throw error;
    }
  }, [refresh, showToast]);

  // Handle upload files button click from CaseDetails
  const handleUploadFiles = useCallback((caseId: string) => {
    console.log('Upload files clicked for case:', caseId);
    // The selected case is already set, so just open the upload modal
    setShowUploadModal(true);
  }, []);

  // Handle when files are uploaded successfully
  const handleFilesUploaded = useCallback(async () => {
    console.log('Files uploaded successfully, fetching updated case...');
    setShowUploadModal(false);
    
    try {
      // Immediately fetch the updated case to show new files
      if (selectedCase) {
        console.log('Fetching case:', selectedCase.id);
        const response = await fetch(`/api/cases/${selectedCase.id}`, {
          credentials: 'include',
          cache: 'no-cache' // Ensure we get fresh data
        });
        
        if (response.ok) {
          const updatedCase = await response.json();
          console.log('Updated case data received:', {
            caseId: updatedCase.id,
            scanFileUrl: updatedCase.scanFileUrl,
            filesCount: updatedCase.scanFileUrl ? JSON.parse(updatedCase.scanFileUrl) : null
          });
          
          // Update the selected case immediately
          setSelectedCase(updatedCase);
          
          // Update the single case in the local list without refreshing everything
          updateSingleCase(updatedCase);
          
          showToast.success('Files uploaded successfully');
          return;
        } else {
          console.error('Failed to fetch updated case:', response.status, response.statusText);
        }
      }
      
      // Fallback: update just the specific case
      showToast.success('Files uploaded successfully');
      
    } catch (error) {
      console.error('Error fetching updated case:', error);
      showToast.error('Files uploaded but failed to refresh. Please close and reopen the case.');
    }
  }, [showToast, selectedCase, updateSingleCase]);

  // Handle appointment scheduling
  const handleScheduleAppointment = useCallback((caseItem: any) => {
    setSelectedCase(caseItem);
    setSelectedAppointment(null);
    setShowAppointmentModal(true);
  }, []);

  // Handle appointment editing
  const handleEditAppointment = useCallback((appointment: Appointment) => {
    const appointmentCase = localCases.find(c => c.id === appointment.caseId);
    setSelectedCase(appointmentCase || null);
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  }, [localCases]);

  // Handle appointment status update
  const handleUpdateAppointmentStatus = useCallback(async (appointmentId: string, status: AppointmentStatus) => {
    try {
      // Use the optimistic update function from useDentistData
      const result = await updateAppointmentStatus(appointmentId, status);
      showToast.success('Appointment status updated');
      return result;
    } catch (error: any) {
      console.error('Error updating appointment status:', error);
      showToast.error(error.message || 'Failed to update appointment status');
      throw error;
    }
  }, [updateAppointmentStatus, showToast]);

  // Handle appointment submission
  const handleSubmitAppointment = useCallback(async (appointmentData: any) => {
    try {
      // Validate appointment data
      if (!appointmentData.caseId) {
        throw new Error('Please select a case for the appointment');
      }
      
      if (!appointmentData.date || !appointmentData.clinicId) {
        throw new Error('Please fill in all required fields');
      }

      // Ensure we have the appointment ID for updates
      const dataToSend = {
        ...appointmentData,
        id: selectedAppointment?.id || appointmentData.id
      };

      const url = '/api/appointments';
      const method = selectedAppointment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        let errorMessage = selectedAppointment 
          ? 'Failed to update appointment' 
          : 'Failed to create appointment';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          if (errorText && !errorText.includes('<!DOCTYPE')) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      showToast.success(
        selectedAppointment 
          ? 'Appointment updated successfully' 
          : 'Appointment scheduled successfully'
      );
      
      refresh();
      setShowAppointmentModal(false);
      setSelectedAppointment(null);
      setSelectedCase(null);
      
      return result;
    } catch (error: any) {
      console.error('Error in handleSubmitAppointment:', error);
      showToast.error(error.message || 'Error saving appointment');
      throw error;
    }
  }, [selectedAppointment, refresh, showToast]);

  // Handle appointment cancellation
  const handleCancelAppointment = useCallback(async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to cancel appointment' }));
        throw new Error(error.error || 'Failed to cancel appointment');
      }
      
      showToast.success('Appointment cancelled successfully');
      refresh();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      showToast.error(error.message || 'Failed to cancel appointment');
    }
  }, [refresh, showToast]);

  // Loading state
  if (status === 'loading' || dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session?.user || session.user.role !== ROLES.DENTIST) {
    return null;
  }

  // Filter cases based on search and status
  const filterCases = (caseList: any[]) => {
    return caseList.filter(c => 
      (!searchQuery || 
        c.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.patient?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ) &&
      (!filterStatus || c.status === filterStatus)
    );
  };

  const filteredCases = filterCases(localCases);
  const filteredArchivedCases = filterCases(archivedCases);

  // Calculate stats
  const stats = {
    totalCases: localCases?.length || 0,
    inTreatment: localCases?.filter(c => c.status === 'IN_TREATMENT').length || 0,
    totalAppointments: appointments?.length || 0,
    archivedCases: archivedCases?.length || 0
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Toaster position="top-right" />
        
        {/* Sidebar */}
        <Sidebar
          user={{
            name: session.user.name,
            email: session.user.email,
            userId: session.user.userId
          }}
          currentView={currentView}
          onViewChange={setCurrentView}
          onNewCase={() => setShowNewCaseModal(true)}
          clinics={clinics}
          selectedClinic={selectedClinic}
          onClinicChange={setSelectedClinic}
          onAccountClick={() => setShowAccountModal(true)}
          onSignOut={() => signOut({ callbackUrl: '/' })}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                {currentView === 'cases' && 'Case Management'}
                {currentView === 'appointments' && 'Appointments'}
                {currentView === 'archive' && 'Archived Cases'}
              </h2>
              {currentView === 'appointments' && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage your patient appointments and schedule
                </p>
              )}
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              {error && (
                <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400">
                  Error loading data: {error}
                </div>
              )}
              
              {/* Cases View */}
              {currentView === 'cases' && (
                <div className="p-6">
                  <CaseStats 
                    cases={localCases}
                    showArchived={false}
                  />
                  
                  <CaseFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    showArchived={false}
                    onArchiveToggle={(show) => setCurrentView(show ? 'archive' : 'cases')}
                    totalCases={localCases.length}
                    filteredCases={filteredCases.length}
                  />
                  
                  <CaseList
                    cases={localCases}
                    appointments={appointments}
                    loading={dataLoading}
                    searchQuery={searchQuery}
                    filterStatus={filterStatus}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onViewCase={(caseItem) => {
                      setSelectedCase(caseItem);
                      setShowCaseDetails(true);
                    }}
                    onStatusChange={async (caseId, newStatus) => {
                      try {
                        await updateCaseStatus(caseId, newStatus);
                        showToast.success('Status updated');
                        
                        // If case was completed, prompt to archive
                        if (newStatus === 'COMPLETED') {
                          setTimeout(() => {
                            if (confirm('Case completed! Would you like to archive this case?')) {
                              archiveCase(caseId, true);
                              showToast.success('Case archived');
                            }
                          }, 500);
                        }
                      } catch (error: any) {
                        showToast.error(error.message || 'Failed to update status');
                      }
                    }}
                    onArchiveCase={(caseId) => {
                      archiveCase(caseId, true);
                      showToast.success('Case archived');
                    }}
                    onScheduleAppointment={handleScheduleAppointment}
                    isArchiveView={false}
                  />
                </div>
              )}
              
              {/* Appointments View */}
              {currentView === 'appointments' && (
                <div className="p-6">
                  <EnhancedAppointmentsView
                    appointments={appointments}
                    cases={localCases}
                    clinics={clinics}
                    loading={dataLoading}
                    onEditAppointment={handleEditAppointment}
                    onScheduleAppointment={(caseData) => {
                      setSelectedCase(caseData || null);
                      setSelectedAppointment(null);
                      setShowAppointmentModal(true);
                    }}
                    onCancelAppointment={handleCancelAppointment}
                    onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                    onViewCase={(caseId) => {
                      const caseItem = localCases.find(c => c.id === caseId);
                      if (caseItem) {
                        setSelectedCase(caseItem);
                        setShowCaseDetails(true);
                      }
                    }}
                  />
                </div>
              )}
              
              {/* Archive View */}
              {currentView === 'archive' && (
                <div className="p-6">
                  <CaseStats 
                    cases={archivedCases}
                    showArchived={true}
                  />
                  
                  <CaseFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    showArchived={true}
                    onArchiveToggle={(show) => setCurrentView(show ? 'archive' : 'cases')}
                    totalCases={archivedCases.length}
                    filteredCases={filteredArchivedCases.length}
                  />
                  
                  <CaseList
                    cases={archivedCases}
                    appointments={appointments}
                    loading={dataLoading}
                    searchQuery={searchQuery}
                    filterStatus={filterStatus}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onViewCase={(caseItem) => {
                      setSelectedCase(caseItem);
                      setShowCaseDetails(true);
                    }}
                    onStatusChange={async (caseId, newStatus) => {
                      try {
                        await updateCaseStatus(caseId, newStatus);
                        showToast.success('Status updated');
                      } catch (error: any) {
                        showToast.error(error.message || 'Failed to update status');
                      }
                    }}
                    onArchiveCase={(caseId) => {
                      archiveCase(caseId, false); // Unarchive
                      showToast.success('Case restored');
                    }}
                    onScheduleAppointment={handleScheduleAppointment}
                    isArchiveView={true}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modals */}
        <NewCaseModal
          isOpen={showNewCaseModal}
          onClose={() => setShowNewCaseModal(false)}
          onSubmit={handleSubmitCase}
        />

        {showCaseDetails && selectedCase && (
          <CaseDetails
            isOpen={showCaseDetails}
            onClose={() => {
              setShowCaseDetails(false);
              setSelectedCase(null);
            }}
            case={selectedCase}
            appointments={appointments}
            onScheduleAppointment={() => handleScheduleAppointment(selectedCase)}
            onEditAppointment={handleEditAppointment}
            onStatusChange={(caseId, newStatus) => {
              return updateCaseStatus(caseId, newStatus);
            }}
            onUploadFiles={handleUploadFiles}
            onFilesUploaded={handleFilesUploaded}
            isArchiveView={currentView === 'archive'}
            session={session}
          />
        )}

        {/* Upload Additional Files Modal */}
        {showUploadModal && selectedCase && (
          <UploadAdditionalFilesModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            caseId={selectedCase.id}
            caseNumber={selectedCase.caseNumber || selectedCase.id}
            onFilesUploaded={handleFilesUploaded}
          />
        )}

        {showAppointmentModal && (
          <AppointmentModal
            isOpen={showAppointmentModal}
            onClose={() => {
              setShowAppointmentModal(false);
              setSelectedAppointment(null);
              setSelectedCase(null);
            }}
            caseData={selectedCase}
            cases={localCases}
            appointment={selectedAppointment}
            clinics={clinics}
            onSubmit={handleSubmitAppointment}
          />
        )}

        <AccountSettingsModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          user={session.user}
          clinics={clinics}
          onAddClinic={addClinic}
          onDeleteClinic={deleteClinic}
        />
      </div>
    </ErrorBoundary>
  );
}