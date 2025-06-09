// src/components/cases/NewCaseModal.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { useDebouncedCallback, useFormDraft, useToast } from '@/hooks';
import { CaseFormData, CaseFiles } from '@/types/case.types';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CaseFormData, files: CaseFiles) => Promise<void>;
}

// Helper functions for date dropdowns
const getDaysInMonth = (month: number, year: number) => {
  if (!month || !year) return 31; // Default to max days
  return new Date(year, month, 0).getDate();
};

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Add submission tracking
  const submissionInProgress = useRef(false);
  const lastSubmissionTime = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Form data with draft support
  const { draft, updateDraft, clearDraft } = useFormDraft<CaseFormData>('dentist_case_draft', {
    patientFirstName: "",
    patientLastName: "",
    patientEmail: "",
    phone: "",
    sex: "Male",
    dateOfBirth: "",
    notes: "",
    caseNumber: "",
  });

  const [formData, setFormData] = useState<CaseFormData>(draft);
  
  // Separate state for date components
  const [dateComponents, setDateComponents] = useState({
    day: "",
    month: "",
    year: ""
  });
  
  const [files, setFiles] = useState<CaseFiles>({
    upper: { file: null },
    lower: { file: null },
    bite: { file: null },
    additional: [],
  });

  const [patientExists, setPatientExists] = useState<any>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Generate years array (most recent first)
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const yearsArray = [];
    for (let i = currentYear; i >= currentYear - 120; i--) {
      yearsArray.push(i);
    }
    return yearsArray;
  }, [currentYear]);

  // Generate days based on selected month and year
  const days = useMemo(() => {
    const selectedMonth = parseInt(dateComponents.month) || 1;
    const selectedYear = parseInt(dateComponents.year) || currentYear;
    const daysCount = getDaysInMonth(selectedMonth, selectedYear);
    
    const daysArray = [];
    for (let i = 1; i <= daysCount; i++) {
      daysArray.push(i);
    }
    return daysArray;
  }, [dateComponents.month, dateComponents.year, currentYear]);

  // Initialize date components from existing dateOfBirth
  useEffect(() => {
    if (formData.dateOfBirth && !dateComponents.year) {
      try {
        const date = new Date(formData.dateOfBirth);
        if (!isNaN(date.getTime())) {
          setDateComponents({
            day: date.getDate().toString(),
            month: (date.getMonth() + 1).toString(),
            year: date.getFullYear().toString()
          });
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }
  }, [formData.dateOfBirth]);

  // Update formData.dateOfBirth when date components change
  useEffect(() => {
    if (dateComponents.day && dateComponents.month && dateComponents.year) {
      const paddedMonth = dateComponents.month.padStart(2, '0');
      const paddedDay = dateComponents.day.padStart(2, '0');
      const dateString = `${dateComponents.year}-${paddedMonth}-${paddedDay}`;
      
      // Validate the date
      const testDate = new Date(dateString);
      if (!isNaN(testDate.getTime())) {
        setFormData(prev => ({ ...prev, dateOfBirth: dateString }));
      }
    } else {
      setFormData(prev => ({ ...prev, dateOfBirth: "" }));
    }
  }, [dateComponents]);

  // Adjust day if it exceeds days in selected month
  useEffect(() => {
    if (dateComponents.day) {
      const maxDay = days[days.length - 1];
      if (parseInt(dateComponents.day) > maxDay) {
        setDateComponents(prev => ({ ...prev, day: maxDay.toString() }));
      }
    }
  }, [days, dateComponents.day]);

  // Update draft when form data changes
  useEffect(() => {
    if (isOpen && activeStep === 1) {
      updateDraft(formData);
    }
  }, [formData, isOpen, activeStep, updateDraft]);

  // Reset submission tracking when modal closes
  useEffect(() => {
    if (!isOpen) {
      submissionInProgress.current = false;
      lastSubmissionTime.current = 0;
    }
  }, [isOpen]);

  // Check if patient exists - only check PATIENT role users
  const checkPatientExistsCallback = useCallback(
    async (email: string) => {
      if (!email || !email.includes("@")) {
        setPatientExists(null);
        return;
      }
      
      setCheckingEmail(true);
      try {
        const response = await fetch(`/api/users/exists?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to check patient');

        const data = await response.json();
        
        // Only process if user exists AND has PATIENT role
        if (data.exists && data.role === 'PATIENT') {
          setPatientExists(data);
          setFormData(prev => ({
            ...prev,
            patientFirstName: data.firstName || '',
            patientLastName: data.lastName || '',
            phone: data.phone || '',
            sex: data.sex || 'Male',
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          }));
          
          // Update date components if patient exists
          if (data.dateOfBirth) {
            try {
              const date = new Date(data.dateOfBirth);
              if (!isNaN(date.getTime())) {
                setDateComponents({
                  day: date.getDate().toString(),
                  month: (date.getMonth() + 1).toString(),
                  year: date.getFullYear().toString()
                });
              }
            } catch (error) {
              console.error('Error parsing patient date:', error);
            }
          }
          
          showToast.success("Patient found - information auto-filled");
        } else {
          setPatientExists(null);
          setFormData(prev => ({
            ...prev,
            patientFirstName: "",
            patientLastName: "",
            phone: "",
            sex: "Male",
            dateOfBirth: "",
          }));
          setDateComponents({ day: "", month: "", year: "" });
        }
      } catch (err) {
        console.error("Error checking patient:", err);
        setPatientExists(null);
        showToast.error("Error checking patient");
      } finally {
        setCheckingEmail(false);
      }
    },
    [showToast]
  );

  // Debounced version of the check function
  const { debouncedCallback: checkPatientExists } = useDebouncedCallback(
    checkPatientExistsCallback,
    500
  );

  // Handle file change with validation
  const handleFileChange = (type: 'upper' | 'lower' | 'bite', file: File | null) => {
    if (file) {
      // Validate file type
      const validExtensions = ['.stl', '.obj', '.zip', '.ply'];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(ext)) {
        showToast.error(`Invalid file type. Allowed types: ${validExtensions.join(', ')}`);
        return;
      }
      
      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        showToast.error('File size must be less than 100MB');
        return;
      }
    }
    
    setFiles(prev => ({
      ...prev,
      [type]: { file }
    }));
  };

  // Handle additional files
  const handleAdditionalFile = (file: File) => {
    if (files.additional.length >= 10) {
      showToast.warning('Maximum 10 additional files allowed');
      return;
    }

    // Validate file type and size
    const validExtensions = ['.stl', '.obj', '.zip', '.ply'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(ext)) {
      showToast.error(`Invalid file type. Allowed types: ${validExtensions.join(', ')}`);
      return;
    }
    
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      showToast.error('File size must be less than 100MB');
      return;
    }

    setFiles(prev => ({
      ...prev,
      additional: [...prev.additional, { file }]
    }));
  };

  const removeAdditionalFile = (index: number) => {
    setFiles(prev => ({
      ...prev,
      additional: prev.additional.filter((_, i) => i !== index)
    }));
  };

  // Generate unique case number with timestamp
  const generateCaseNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    // Use timestamp for uniqueness instead of just random
    const timestamp = now.getTime();
    const unique = timestamp.toString().slice(-6); // Last 6 digits of timestamp
    return `${year}${month}${day}-${unique}`;
  };

  // Handle form submission with deduplication
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if submission is already in progress
    if (submissionInProgress.current) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }
    
    // Check for rapid successive submissions (within 2 seconds)
    const now = Date.now();
    if (now - lastSubmissionTime.current < 2000) {
      console.log('Submission too soon after last submission, ignoring');
      return;
    }
    
    // Validation
    if (!files.upper.file && !files.lower.file && !files.bite.file) {
      showToast.error("Please upload at least one scan file");
      return;
    }

    if (!formData.dateOfBirth) {
      showToast.error("Please select date of birth");
      return;
    }

    // Set submission flags
    submissionInProgress.current = true;
    lastSubmissionTime.current = now;
    setSubmitting(true);
    
    try {
      const finalFormData = {
        ...formData,
        caseNumber: formData.caseNumber || generateCaseNumber()
      };
      
      // Create FormData for multipart upload
      const uploadData = new FormData();
      
      // Add a unique request ID for server-side deduplication
      const requestId = `${finalFormData.patientEmail}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      uploadData.append('requestId', requestId);
      
      // Add form fields
      uploadData.append('patientEmail', finalFormData.patientEmail);
      uploadData.append('patientFirstName', finalFormData.patientFirstName);
      uploadData.append('patientLastName', finalFormData.patientLastName);
      uploadData.append('phone', finalFormData.phone || '');
      uploadData.append('sex', finalFormData.sex);
      uploadData.append('dateOfBirth', finalFormData.dateOfBirth);
      uploadData.append('notes', finalFormData.notes || '');
      uploadData.append('caseNumber', finalFormData.caseNumber);
      
      // Add files
      if (files.upper.file) {
        uploadData.append('upper', files.upper.file);
      }
      if (files.lower.file) {
        uploadData.append('lower', files.lower.file);
      }
      if (files.bite.file) {
        uploadData.append('bite', files.bite.file);
      }
      
      // Add additional files
      files.additional.forEach((fileObj, index) => {
        if (fileObj.file) {
          uploadData.append(`additional_${index}`, fileObj.file);
        }
      });
      
      // Submit to API with abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('/api/cases', {
        method: 'POST',
        body: uploadData,
        credentials: 'include',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Failed to create case' };
        }
        
        throw new Error(errorData?.error || 'Failed to create case');
      }
      
      const result = await response.json();
      showToast.success(`Case ${result.caseNumber} created successfully`);
      
      // Call the parent's onSubmit (for refreshing data)
      await onSubmit(finalFormData, files);
      
      clearDraft();
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Error submitting case:", err);
      if (err.name === 'AbortError') {
        showToast.error("Request timed out. Please try again.");
      } else {
        showToast.error(err.message || "Error submitting case");
      }
    } finally {
      setSubmitting(false);
      submissionInProgress.current = false;
    }
  };

  const resetForm = () => {
    setFormData({
      patientFirstName: "",
      patientLastName: "",
      patientEmail: "",
      phone: "",
      sex: "Male",
      dateOfBirth: "",
      notes: "",
      caseNumber: "",
    });
    setDateComponents({ day: "", month: "", year: "" });
    setFiles({
      upper: { file: null },
      lower: { file: null },
      bite: { file: null },
      additional: [],
    });
    setPatientExists(null);
    setActiveStep(1);
    submissionInProgress.current = false;
    lastSubmissionTime.current = 0;
  };

  const handleClose = () => {
    if (submitting) {
      showToast.warning("Please wait for the submission to complete");
      return;
    }
    resetForm();
    onClose();
  };

  const validateStep1 = () => {
    return formData.patientEmail && 
           formData.patientFirstName && 
           formData.patientLastName && 
           formData.dateOfBirth &&
           formData.sex;
  };

  return (
    <>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={handleClose}
          />
          
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
              <div className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 sm:px-6 sm:py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">Submit New Case</h2>
                      <p className="text-xs sm:text-sm text-blue-100">
                        Create a new aligner case for your patient
                      </p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      type="button"
                      disabled={submitting}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto">
                  <form ref={formRef} onSubmit={handleSubmit} className="p-6">
                    {/* Step Indicator */}
                    <StepIndicator activeStep={activeStep} />

                    {/* Step 1: Patient Information */}
                    {activeStep === 1 && (
                      <PatientInfoStep
                        formData={formData}
                        dateComponents={dateComponents}
                        patientExists={patientExists}
                        checkingEmail={checkingEmail}
                        days={days}
                        months={months}
                        years={years}
                        onFormChange={setFormData}
                        onDateChange={setDateComponents}
                        onEmailChange={(email) => {
                          setFormData({ ...formData, patientEmail: email });
                          checkPatientExists(email);
                        }}
                        onNext={() => {
                          if (validateStep1()) {
                            setActiveStep(2);
                          } else {
                            showToast.error("Please fill in all required fields");
                          }
                        }}
                      />
                    )}

                    {/* Step 2: Scan Files */}
                    {activeStep === 2 && (
                      <ScanFilesStep
                        files={files}
                        formData={formData}
                        onFileChange={handleFileChange}
                        onAdditionalFile={handleAdditionalFile}
                        onRemoveAdditionalFile={removeAdditionalFile}
                        onFormChange={setFormData}
                        onBack={() => setActiveStep(1)}
                        onNext={() => setActiveStep(3)}
                      />
                    )}

                    {/* Step 3: Review */}
                    {activeStep === 3 && (
                      <ReviewStep
                        formData={formData}
                        files={files}
                        submitting={submitting}
                        onBack={() => setActiveStep(2)}
                        onSubmit={handleSubmit}
                      />
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Step Components remain the same...
// (Include all the Step components from the original file)

// Step Indicator Component
const StepIndicator: React.FC<{ activeStep: number }> = ({ activeStep }) => (
  <div className="mb-8">
    <div className="flex items-center justify-center">
      {[1, 2, 3].map((step, index) => (
        <React.Fragment key={step}>
          <div className={`flex items-center ${activeStep >= step ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 ${
              activeStep >= step ? 'bg-blue-600 text-white scale-110' : 'bg-gray-200'
            }`}>
              {step}
            </div>
            <span className="ml-3 font-medium hidden sm:block">
              {step === 1 ? 'Patient Info' : step === 2 ? 'Scan Files' : 'Review'}
            </span>
          </div>
          {index < 2 && (
            <div className={`w-12 sm:w-24 h-1 mx-2 sm:mx-4 transition-all duration-300 ${
              activeStep > step ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

// Patient Info Step Component
interface PatientInfoStepProps {
  formData: CaseFormData;
  dateComponents: { day: string; month: string; year: string };
  patientExists: any;
  checkingEmail: boolean;
  days: number[];
  months: { value: number; label: string }[];
  years: number[];
  onFormChange: (data: CaseFormData) => void;
  onDateChange: (components: { day: string; month: string; year: string }) => void;
  onEmailChange: (email: string) => void;
  onNext: () => void;
}

const PatientInfoStep: React.FC<PatientInfoStepProps> = ({
  formData,
  dateComponents,
  patientExists,
  checkingEmail,
  days,
  months,
  years,
  onFormChange,
  onDateChange,
  onEmailChange,
  onNext
}) => {
  return (
    <div className="space-y-6">
      {/* Email Field with Status Indicator */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Patient Email <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="email"
            value={formData.patientEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full px-4 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12 text-base"
            placeholder="patient@example.com"
            required
          />
          {checkingEmail && (
            <div className="absolute right-3 top-3.5">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
          {!checkingEmail && formData.patientEmail && formData.patientEmail.includes('@') && (
            <div className="absolute right-3 top-3.5">
              {patientExists ? (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          )}
        </div>
        {patientExists && (
          <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Patient found - information auto-filled
          </p>
        )}
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.patientFirstName}
            onChange={(e) => onFormChange({ ...formData, patientFirstName: e.target.value })}
            className="w-full px-4 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
            placeholder="John"
            required
            disabled={!!patientExists}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.patientLastName}
            onChange={(e) => onFormChange({ ...formData, patientLastName: e.target.value })}
            className="w-full px-4 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
            placeholder="Doe"
            required
            disabled={!!patientExists}
          />
        </div>
      </div>

      {/* Date of Birth - Three Dropdowns */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Date of Birth <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Day</label>
            <select
              value={dateComponents.day}
              onChange={(e) => onDateChange({ ...dateComponents, day: e.target.value })}
              className="w-full px-3 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base appearance-none cursor-pointer"
              required
              disabled={!!patientExists}
            >
              <option value="">DD</option>
              {days.map(day => (
                <option key={day} value={day}>{day.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Month</label>
            <select
              value={dateComponents.month}
              onChange={(e) => onDateChange({ ...dateComponents, month: e.target.value })}
              className="w-full px-3 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base appearance-none cursor-pointer"
              required
              disabled={!!patientExists}
            >
              <option value="">Month</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Year</label>
            <select
              value={dateComponents.year}
              onChange={(e) => onDateChange({ ...dateComponents, year: e.target.value })}
              className="w-full px-3 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base appearance-none cursor-pointer"
              required
              disabled={!!patientExists}
            >
              <option value="">YYYY</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Phone and Sex Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onFormChange({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
            placeholder="(123) 456-7890"
            disabled={!!patientExists}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Sex <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.sex}
            onChange={(e) => onFormChange({ ...formData, sex: e.target.value as any })}
            className="w-full px-4 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base appearance-none cursor-pointer"
            required
            disabled={!!patientExists}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Prefer not to reply">Prefer not to reply</option>
          </select>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
        >
          Next Step →
        </button>
      </div>
    </div>
  );
};

// Scan Files Step Component
interface ScanFilesStepProps {
  files: CaseFiles;
  formData: CaseFormData;
  onFileChange: (type: 'upper' | 'lower' | 'bite', file: File | null) => void;
  onAdditionalFile: (file: File) => void;
  onRemoveAdditionalFile: (index: number) => void;
  onFormChange: (data: CaseFormData) => void;
  onBack: () => void;
  onNext: () => void;
}

const ScanFilesStep: React.FC<ScanFilesStepProps> = ({
  files,
  formData,
  onFileChange,
  onAdditionalFile,
  onRemoveAdditionalFile,
  onFormChange,
  onBack,
  onNext
}) => (
  <div className="flex flex-col h-full">
    <div className="flex-1 overflow-y-auto space-y-4 pb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Upload Scan Files</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload at least one scan file. Supported formats: STL, OBJ, ZIP, PLY
        </p>
        
        {/* Main Scan Files Grid - Reduced padding */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['upper', 'lower', 'bite'] as const).map((type) => (
            <div key={type} className="relative">
              <label
                htmlFor={`${type}-scan`}
                className={`block w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all transform hover:scale-105 ${
                  files[type].file
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 hover:border-green-600'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="text-center">
                  {files[type].file ? (
                    <svg className="w-10 h-10 mx-auto text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                    {type} Scan
                  </p>
                  {files[type].file ? (
                    <p className="text-xs text-green-600 dark:text-green-400 truncate px-2 mt-1">
                      {files[type].file!.name}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Click to upload
                    </p>
                  )}
                </div>
              </label>
              <input
                id={`${type}-scan`}
                type="file"
                accept=".stl,.obj,.zip,.ply"
                onChange={(e) => onFileChange(type, e.target.files?.[0] || null)}
                className="hidden"
              />
              {files[type].file && (
                <button
                  type="button"
                  onClick={() => onFileChange(type, null)}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform hover:scale-110 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional Files Section - Reduced spacing */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Additional Files (Optional)
        </h4>
        <div className="space-y-2">
          {files.additional.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-2">
              {files.additional.map((fileObj, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{fileObj.file!.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveAdditionalFile(index)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-xs ml-2 flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <label className="block w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 text-center transition-all">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add additional files ({files.additional.length}/10)</span>
            </div>
            <input
              type="file"
              multiple
              accept=".stl,.obj,.zip,.ply"
              onChange={(e) => {
                if (e.target.files) {
                  Array.from(e.target.files).forEach(onAdditionalFile);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Notes Field - Reduced height */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Clinical Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none"
          placeholder="Add any special instructions, treatment preferences, or clinical observations..."
        />
      </div>
    </div>

    {/* Navigation - Fixed at bottom */}
    <div className="flex justify-between pt-4 border-t dark:border-gray-600 mt-auto">
      <button
        type="button"
        onClick={onBack}
        className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
      >
        ← Back
      </button>
      <button
        type="button"
        onClick={onNext}
        className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!files.upper.file && !files.lower.file && !files.bite.file}
      >
        Next Step →
      </button>
    </div>
  </div>
);

// Review Step Component
interface ReviewStepProps {
  formData: CaseFormData;
  files: CaseFiles;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  files,
  submitting,
  onBack,
  onSubmit
}) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Review Case Submission</h3>
    
    {/* Patient Information Card */}
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 shadow-sm">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Patient Information
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-1">Full Name</p>
          <p className="text-gray-900 dark:text-white font-medium">{formData.patientFirstName} {formData.patientLastName}</p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-1">Email</p>
          <p className="text-gray-900 dark:text-white font-medium">{formData.patientEmail}</p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-1">Phone</p>
          <p className="text-gray-900 dark:text-white font-medium">{formData.phone || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-1">Date of Birth</p>
          <p className="text-gray-900 dark:text-white font-medium">
            {formData.dateOfBirth ? format(parseISO(formData.dateOfBirth), 'MMMM d, yyyy') : 'Not provided'}
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-1">Sex</p>
          <p className="text-gray-900 dark:text-white font-medium">
            {formData.sex}
          </p>
        </div>
      </div>
    </div>

    {/* Scan Files Card */}
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 shadow-sm">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Scan Files
      </h4>
      <div className="space-y-2">
        {files.upper.file && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">Upper scan:</span>
            <span className="text-gray-900 dark:text-white font-medium truncate">{files.upper.file.name}</span>
          </div>
        )}
        {files.lower.file && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">Lower scan:</span>
            <span className="text-gray-900 dark:text-white font-medium truncate">{files.lower.file.name}</span>
          </div>
        )}
        {files.bite.file && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">Bite scan:</span>
            <span className="text-gray-900 dark:text-white font-medium truncate">{files.bite.file.name}</span>
          </div>
        )}
        {files.additional.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">Additional files:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {files.additional.length} file{files.additional.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>

    {/* Notes Card (if present) */}
    {formData.notes && (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 shadow-sm">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Clinical Notes
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{formData.notes}</p>
      </div>
    )}

    {/* Navigation */}
    <div className="flex justify-between pt-6 border-t dark:border-gray-600">
      <button
        type="button"
        onClick={onBack}
        className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        disabled={submitting}
      >
        ← Back
      </button>
      <button
        type="submit"
        disabled={submitting || (!files.upper.file && !files.lower.file && !files.bite.file)}
        className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-3"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!submitting) {
            onSubmit(e);
          }
        }}
      >
        {submitting && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        )}
        {submitting ? 'Submitting...' : 'Submit Case'}
      </button>
    </div>
  </div>
);