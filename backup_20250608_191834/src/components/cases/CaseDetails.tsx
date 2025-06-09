// CaseDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Case, CaseStatus, CaseStatusColors, CaseStatusLabels } from '@/types/case.types';
import { FilePreview } from '@/components/shared/FilePreview';
import { Appointments } from '@/components/appointments/Appointments';
import { CaseTimeline } from './CaseTimeline';
import { CaseNotes } from './CaseNotes';
import { UploadAdditionalFilesModal } from './UploadAdditionalFilesModal';
import { useToast, useCaseActivities } from '@/hooks';
import { format } from 'date-fns';
import { AppointmentTimeline } from '@/components/appointments/AppointmentTimeline';
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal';

interface CaseDetailsProps {
  case: Case | null;
  appointments: any[];
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (caseId: string, status: string) => Promise<void>;
  onScheduleAppointment: () => void;
  onEditAppointment: (appointment: any) => void;
  onUploadFiles?: (caseId: string) => void;
  onFilesUploaded?: () => void;
  isArchiveView?: boolean;
  session?: any;
}

export const CaseDetails: React.FC<CaseDetailsProps> = ({
  case: selectedCase,
  appointments,
  isOpen,
  onClose,
  onStatusChange,
  onScheduleAppointment,
  onEditAppointment,
  onUploadFiles,
  onFilesUploaded,
  isArchiveView = false,
  session
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'appointments' | 'notes'>('overview');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [previousCaseId, setPreviousCaseId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filesVersion, setFilesVersion] = useState(0); // For forcing re-render after file changes
  
  const { activities, loading: activitiesLoading, refetch: refetchActivities } = useCaseActivities(selectedCase?.id || null);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Only reset tab when opening a different case
  useEffect(() => {
    if (selectedCase && selectedCase.id !== previousCaseId) {
      // Only reset if it's a different case
      if (previousCaseId !== null) {
        setActiveTab('overview');
      }
      setPreviousCaseId(selectedCase.id);
    }
  }, [selectedCase?.id, previousCaseId]);

  if (!selectedCase || !isOpen) return null;

  // Simplified and more robust file parsing
  const parseScanFiles = (caseData: Case) => {
    const files: Record<string, string | string[]> = {};
    
    // First try to parse scanFileUrl which contains all files as JSON
    if (caseData.scanFileUrl) {
      try {
        const parsed = JSON.parse(caseData.scanFileUrl);
        console.log('Parsed scan files from scanFileUrl:', parsed);
        
        // Ensure all file paths are properly formatted
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'string') {
            files[key] = value;
          } else if (Array.isArray(value)) {
            files[key] = value;
          }
        }
        
        return files;
      } catch (e) {
        console.error('Error parsing scanFileUrl:', e);
      }
    }
    
    // Fallback to individual fields if scanFileUrl parsing fails
    if (caseData.upperScanFile) files.upper = caseData.upperScanFile;
    if (caseData.lowerScanFile) files.lower = caseData.lowerScanFile;
    if (caseData.biteScanFile) files.bite = caseData.biteScanFile;
    
    console.log('Final parsed files:', files);
    return files;
  };

  const scanFiles = parseScanFiles(selectedCase);

  // Calculate current additional file count
  const currentAdditionalFileCount = useMemo(() => {
    if (scanFiles.additional && Array.isArray(scanFiles.additional)) {
      return scanFiles.additional.length;
    }
    return 0;
  }, [scanFiles]);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Change status to ${CaseStatusLabels[newStatus as CaseStatus]}?`)) {
      return;
    }

    setUpdatingStatus(true);
    
    const originalStatus = selectedCase.status;
    selectedCase.status = newStatus;
    
    try {
      await onStatusChange(selectedCase.id, newStatus);
      showToast.success('Status updated successfully');
      refetchActivities();
    } catch (error) {
      selectedCase.status = originalStatus;
      showToast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleViewAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const handleUploadFiles = () => {
    setShowUploadModal(true);
  };

  const handleFileDeleted = async () => {
    // Refresh case data after file deletion
    if (onFilesUploaded) {
      await onFilesUploaded();
    }
    // Force re-render of files
    setFilesVersion(prev => prev + 1);
    // Refresh activities
    refetchActivities();
  };

  const caseAppointments = appointments.filter(apt => apt.caseId === selectedCase.id);

  // Count all files including additional ones
  const totalFileCount = Object.keys(scanFiles).reduce((count, key) => {
    const value = scanFiles[key];
    if (Array.isArray(value)) {
      return count + value.length;
    } else if (value) {
      return count + 1;
    }
    return count;
  }, 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'files', label: 'Files', icon: '📁', count: totalFileCount },
    { id: 'appointments', label: 'Appointments', icon: '📅', count: caseAppointments.length },
    { id: 'notes', label: 'Notes', icon: '📝' },
  ];

  // Check if user can delete files
  const canDeleteFiles = !isArchiveView && (session?.user?.role === 'ADMIN' || session?.user?.role === 'DENTIST');

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
          <div className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold truncate">
                      Case #{selectedCase.caseNumber || selectedCase.id}
                    </h2>
                    <p className="text-xs sm:text-sm text-blue-100 truncate">
                      {selectedCase.patient.name} • ID: {selectedCase.patient.userId}
                    </p>
                  </div>
                  
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    CaseStatusColors[selectedCase.status as CaseStatus]
                  }`}>
                    {CaseStatusLabels[selectedCase.status as CaseStatus]}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isArchiveView && (
                    <button
                      onClick={onScheduleAppointment}
                      className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                      title="Schedule Appointment"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
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
            </div>

            {/* Appointment Timeline */}
            <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">Appointments:</span>
                <div className="flex-1 min-w-0">
                  <AppointmentTimeline 
                    appointments={caseAppointments} 
                    caseId={selectedCase.id}
                    loading={false}
                    onViewAppointment={handleViewAppointment}
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                        activeTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 min-h-full">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Patient Information
                            </h3>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">Name:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedCase.patient.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">ID:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedCase.patient.userId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">Email:</span>
                                <span className="font-medium text-gray-900 dark:text-white text-xs truncate max-w-[150px]">
                                  {selectedCase.patient.email || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">Phone:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {selectedCase.patient.phone || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Case Details
                            </h3>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">Submitted:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedCase.createdAt)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">Updated:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {selectedCase.updatedAt ? formatDate(selectedCase.updatedAt) : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">Dentist:</span>
                                <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                                  {selectedCase.dentist?.name || 'Unassigned'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">Since:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {selectedCase.patient.createdAt ? formatDate(selectedCase.patient.createdAt) : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedCase.notes && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Initial Notes</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                            {selectedCase.notes}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {totalFileCount}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Files</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {caseAppointments.length}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Appointments</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {activities.length}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Activities</p>
                        </div>
                      </div>

                      {!isArchiveView && session?.user?.role === 'ADMIN' && (
                        <StatusActions
                          currentStatus={selectedCase.status as CaseStatus}
                          onStatusChange={handleStatusChange}
                          loading={updatingStatus}
                        />
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'files' && (
                  <div className="space-y-4">
                    {totalFileCount === 0 ? (
                      <div className="text-center py-8">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">No files uploaded yet</p>
                      </div>
                    ) : (
                      <>
                        {/* Main scan files */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                            <span>Scan Files</span>
                            {canDeleteFiles && (
                              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                                Hover over files to see options
                              </span>
                            )}
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(['upper', 'lower', 'bite'] as const).map((type) => {
                              const fileUrl = scanFiles[type] as string;
                              if (!fileUrl) return null;
                              
                              return (
                                <div key={type} className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                                  <FilePreview 
                                    file={fileUrl} 
                                    type={type} 
                                    height="h-32" 
                                    showDownload={true}
                                    showFullscreen={true}
                                    showDelete={canDeleteFiles}
                                    caseId={selectedCase.id}
                                    fileId={type}
                                    onDelete={async () => {
                                      await handleFileDeleted();
                                      showToast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} scan deleted successfully`);
                                    }}
                                    className="cursor-pointer hover:opacity-90 transition-opacity"
                                  />
                                  <div className="p-2 text-center">
                                    <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                                      {type} Scan
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Additional files */}
                        {scanFiles.additional && Array.isArray(scanFiles.additional) && scanFiles.additional.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Additional Files ({scanFiles.additional.length})
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {scanFiles.additional.map((file: string, index: number) => (
                                <div key={`additional-${index}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                                  <FilePreview 
                                    file={file} 
                                    type={`additional-${index + 1}`} 
                                    height="h-32"
                                    showDownload={true}
                                    showFullscreen={true}
                                    showDelete={canDeleteFiles}
                                    caseId={selectedCase.id}
                                    fileId={`additional-${index}`}
                                    onDelete={async () => {
                                      await handleFileDeleted();
                                      showToast.success('Additional file deleted successfully');
                                    }}
                                  />
                                  <div className="p-2 text-center">
                                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                                      Additional File {index + 1}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* File management info */}
                        {canDeleteFiles && totalFileCount > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="text-xs text-blue-800 dark:text-blue-200">
                                <p className="font-medium mb-1">File Management</p>
                                <ul className="space-y-0.5 text-blue-700 dark:text-blue-300">
                                  <li>• Hover over files to see download and delete options</li>
                                  <li>• Click on 3D files to view them in fullscreen</li>
                                  <li>• Deleted files cannot be recovered</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {onUploadFiles && !isArchiveView && (
                      <div className="flex flex-col items-center gap-2 pt-4 border-t dark:border-gray-700">
                        <button
                          onClick={handleUploadFiles}
                          disabled={currentAdditionalFileCount >= 10}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentAdditionalFileCount >= 10
                              ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {currentAdditionalFileCount >= 10 ? 'Maximum Files Reached' : 'Upload Additional Files'}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {currentAdditionalFileCount}/10 additional files
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'appointments' && (
                  <div className="h-full">
                    <Appointments 
                      caseId={selectedCase.id}
                      appointments={caseAppointments}
                      onEditAppointment={onEditAppointment}
                    />
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="h-full">
                    <CaseNotes caseId={selectedCase.id} isArchiveView={isArchiveView} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <UploadAdditionalFilesModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          caseId={selectedCase.id}
          caseNumber={selectedCase.caseNumber}
          currentFileCount={currentAdditionalFileCount}
          onFilesUploaded={async () => {
            setShowUploadModal(false);
            try {
              // Trigger refresh of case data
              if (onFilesUploaded) {
                await onFilesUploaded();
              }
              // Force re-render and stay on files tab
              setFilesVersion(prev => prev + 1);
              setActiveTab('files');
              showToast.success('Files uploaded successfully');
            } catch (error) {
              console.error('Error refreshing case data:', error);
              showToast.error('Files uploaded but failed to refresh view. Please reload the page.');
            }
          }}
        />
      )}

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={showAppointmentDetails}
        onClose={() => {
          setShowAppointmentDetails(false);
          setSelectedAppointment(null);
        }}
        onEdit={onEditAppointment}
        onStatusUpdate={async (appointmentId, status) => {
          setShowAppointmentDetails(false);
          setSelectedAppointment(null);
        }}
        caseId={selectedCase.id}
      />

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-3 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </>
  );
};

// StatusActions component
interface StatusActionsProps {
  currentStatus: CaseStatus;
  onStatusChange: (status: string) => void;
  loading: boolean;
}

const StatusActions: React.FC<StatusActionsProps> = ({ currentStatus, onStatusChange, loading }) => {
  const getAvailableActions = () => {
    switch (currentStatus) {
      case CaseStatus.PENDING_REVIEW:
        return [
          { label: 'Approve', status: CaseStatus.AWAITING_CONSENT, className: 'bg-green-600 hover:bg-green-700' },
          { label: 'Reject', status: CaseStatus.REJECTED, className: 'bg-red-600 hover:bg-red-700' }
        ];
      case CaseStatus.AWAITING_CONSENT:
        return [
          { label: 'Start Treatment', status: CaseStatus.IN_TREATMENT, className: 'bg-blue-600 hover:bg-blue-700' }
        ];
      case CaseStatus.IN_TREATMENT:
        return [
          { label: 'Complete', status: CaseStatus.COMPLETED, className: 'bg-green-600 hover:bg-green-700' },
          { label: 'Manufacturing', status: CaseStatus.MANUFACTURING, className: 'bg-purple-600 hover:bg-purple-700' }
        ];
      case CaseStatus.MANUFACTURING:
        return [
          { label: 'Ship', status: CaseStatus.SHIPPED, className: 'bg-indigo-600 hover:bg-indigo-700' }
        ];
      case CaseStatus.SHIPPED:
        return [
          { label: 'Complete', status: CaseStatus.COMPLETED, className: 'bg-green-600 hover:bg-green-700' }
        ];
      case CaseStatus.COMPLETED:
        return [
          { label: 'Reopen', status: CaseStatus.IN_TREATMENT, className: 'bg-amber-600 hover:bg-amber-700' }
        ];
      default:
        return [];
    }
  };

  const actions = getAvailableActions();

  if (actions.length === 0) return null;

  return (
    <div className="border-t pt-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Quick Actions</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => onStatusChange(action.status)}
            disabled={loading}
            className={`px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span className="text-xs">Processing...</span>
              </div>
            ) : (
              action.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
};