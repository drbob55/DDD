// src/hooks/useDentistData.ts
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Appointment, Clinic } from '@/types/appointment.types';

interface DentistDataOptions {
  userId?: string;
  enablePolling?: boolean;
  pollingInterval?: number; // in milliseconds
  enableWebSocket?: boolean;
}

export const useDentistData = (options: DentistDataOptions = {}) => {
  const { data: session, status } = useSession();
  const [cases, setCases] = useState<any[]>([]);
  const [archivedCases, setArchivedCases] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to prevent unnecessary refetches
  const lastFetchTime = useRef<number>(0);
  const isUpdating = useRef<boolean>(false);
  
  // Track if we need to refetch archived cases
  const shouldRefetchArchived = useRef<boolean>(false);

  // Fetch dentist data
  const fetchData = useCallback(async (force: boolean = false, fetchArchived: boolean = true) => {
    // Prevent concurrent fetches and too frequent fetches
    const now = Date.now();
    if (!force && (isUpdating.current || now - lastFetchTime.current < 5000)) {
      return;
    }
    
    // Only fetch if we have a valid session
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }
    
    try {
      // Don't show loading state for background refreshes
      if (force || lastFetchTime.current === 0) {
        setLoading(true);
      }
      
      setError(null);
      isUpdating.current = true;
      lastFetchTime.current = now;

      // Build the list of fetches based on what we need
      const fetches: Promise<Response | null>[] = [
        fetch('/api/cases?archived=false', { credentials: 'include' }),
        fetch('/api/appointments', { credentials: 'include' }),
        fetch('/api/clinics', { credentials: 'include' }).catch(() => null)
      ];
      
      // Only fetch archived if needed or forced
      if (fetchArchived || shouldRefetchArchived.current) {
        fetches.push(fetch('/api/cases?archived=true', { credentials: 'include' }));
        shouldRefetchArchived.current = false;
      }

      const responses = await Promise.all(fetches);
      const [activeCasesRes, appointmentsRes, clinicsRes, archivedCasesRes] = responses;

      // Process active cases
      if (activeCasesRes && activeCasesRes.ok) {
        const activeCasesData = await activeCasesRes.json();
        setCases(activeCasesData.cases || []);
      }

      // Process archived cases if we fetched them
      if (archivedCasesRes && archivedCasesRes.ok) {
        const archivedCasesData = await archivedCasesRes.json();
        setArchivedCases(archivedCasesData.cases || []);
      }

      // Process appointments
      if (appointmentsRes && appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAppointments(appointmentsData || []);
      }

      // Process clinics
      if (clinicsRes && clinicsRes.ok) {
        const clinicsData = await clinicsRes.json();
        setClinics(clinicsData || []);
        if (clinicsData.length > 0 && !selectedClinic) {
          setSelectedClinic(clinicsData[0].id);
        }
      } else {
        // Use default clinic if no clinics API
        setClinics([{ id: '1', name: 'Main Clinic' }]);
      }

    } catch (err) {
      console.error('Error fetching dentist data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      isUpdating.current = false;
    }
  }, [session?.user?.id, status, selectedClinic]);

  // Initial fetch - only when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchData(true, true); // Force fetch and include archived
    }
  }, [status, session?.user?.id, fetchData]);

  // Polling effect with smart interval
  useEffect(() => {
    if (options.enablePolling && status === 'authenticated' && session?.user?.id) {
      // Use longer interval, default to 60 seconds
      const interval = setInterval(() => {
        // During polling, only fetch archived if we've flagged it
        fetchData(false, shouldRefetchArchived.current);
      }, options.pollingInterval || 60000);
      
      return () => clearInterval(interval);
    }
  }, [options.enablePolling, options.pollingInterval, status, session?.user?.id, fetchData]);

  // Archive or restore case with improved update logic
  const archiveCase = useCallback(async (caseId: string, archive: boolean) => {
    try {
      // Store the original state for rollback
      const originalCases = [...cases];
      const originalArchivedCases = [...archivedCases];
      
      // Optimistic update
      if (archive) {
        const caseToArchive = cases.find(c => c.id === caseId);
        if (caseToArchive) {
          setCases(prev => prev.filter(c => c.id !== caseId));
          setArchivedCases(prev => [...prev, { ...caseToArchive, archivedByDentist: true, archivedAt: new Date().toISOString() }]);
        }
      } else {
        const caseToRestore = archivedCases.find(c => c.id === caseId);
        if (caseToRestore) {
          setArchivedCases(prev => prev.filter(c => c.id !== caseId));
          setCases(prev => [...prev, { ...caseToRestore, archivedByDentist: false, archivedAt: null }]);
        }
      }
      
      const response = await fetch(`/api/cases/${caseId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ archive }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setCases(originalCases);
        setArchivedCases(originalArchivedCases);
        
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to ${archive ? 'archive' : 'restore'} case`);
      }

      const result = await response.json();
      
      // Update with the actual case data from server
      if (result.case) {
        if (archive) {
          // Ensure the case is in archived and not in active
          setCases(prev => prev.filter(c => c.id !== caseId));
          setArchivedCases(prev => {
            const exists = prev.some(c => c.id === caseId);
            if (exists) {
              return prev.map(c => c.id === caseId ? result.case : c);
            }
            return [...prev, result.case];
          });
        } else {
          // Ensure the case is in active and not in archived
          setArchivedCases(prev => prev.filter(c => c.id !== caseId));
          setCases(prev => {
            const exists = prev.some(c => c.id === caseId);
            if (exists) {
              return prev.map(c => c.id === caseId ? result.case : c);
            }
            return [...prev, result.case];
          });
        }
      }
      
      // Flag that we should refetch archived cases on next poll
      if (archive) {
        shouldRefetchArchived.current = true;
      }

      return result;
    } catch (err) {
      console.error(`Error ${archive ? 'archiving' : 'restoring'} case:`, err);
      // Ensure we refetch to get correct state
      shouldRefetchArchived.current = true;
      throw err;
    }
  }, [cases, archivedCases]);

  // Update case status with optimistic update
  const updateCaseStatus = useCallback(async (caseId: string, status: string) => {
    try {
      // Store original state for both lists
      const originalCases = [...cases];
      const originalArchivedCases = [...archivedCases];
      
      // Optimistic update - update in both lists to handle all scenarios
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, status } : c
      ));
      setArchivedCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, status } : c
      ));
      
      const response = await fetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setCases(originalCases);
        setArchivedCases(originalArchivedCases);
        
        let errorMessage = `Failed to update case status (${response.status})`;
        
        try {
          const errorText = await response.text();
          if (errorText && errorText.trim() !== '') {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
              if (errorText.includes('<!DOCTYPE html>')) {
                errorMessage = 'API endpoint not found. Please check server configuration.';
              }
            }
          }
        } catch (readError) {
          console.error('Failed to read error response:', readError);
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Update with server response to ensure consistency
      if (result.case) {
        setCases(prev => prev.map(c => 
          c.id === caseId ? result.case : c
        ));
        setArchivedCases(prev => prev.map(c => 
          c.id === caseId ? result.case : c
        ));
      }
      
      return result;
    } catch (err) {
      console.error('Error updating case status:', err);
      throw err;
    }
  }, [cases, archivedCases]);

  // Add appointment with optimistic update
  const addAppointment = useCallback(async (appointmentData: any) => {
    try {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticAppointment = {
        ...appointmentData,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Optimistic update
      setAppointments(prev => [...prev, optimisticAppointment]);
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        // Revert optimistic update
        setAppointments(prev => prev.filter(a => a.id !== tempId));
        throw new Error('Failed to create appointment');
      }

      const newAppointment = await response.json();
      
      // Replace temp appointment with real one
      setAppointments(prev => prev.map(a => 
        a.id === tempId ? newAppointment : a
      ));
      
      return newAppointment;
    } catch (err) {
      console.error('Error adding appointment:', err);
      throw err;
    }
  }, []);

  // Update appointment with optimistic update
  const updateAppointment = useCallback(async (appointmentData: any) => {
    try {
      const appointmentId = appointmentData.id;
      
      // Optimistic update
      setAppointments(prev => prev.map(a => 
        a.id === appointmentId ? { ...a, ...appointmentData } : a
      ));
      
      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        // Revert optimistic update
        await fetchData(true, false);
        throw new Error('Failed to update appointment');
      }

      const updatedAppointment = await response.json();
      
      // Update with server response
      setAppointments(prev => prev.map(a => 
        a.id === appointmentId ? updatedAppointment : a
      ));
      
      return updatedAppointment;
    } catch (err) {
      console.error('Error updating appointment:', err);
      throw err;
    }
  }, [fetchData]);

  // Update appointment status with optimistic update
  const updateAppointmentStatus = useCallback(async (appointmentId: string, status: string) => {
    try {
      // Store original appointments for rollback
      const originalAppointments = [...appointments];
      
      // Optimistic update - immediately update the UI
      setAppointments(prev => prev.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, status, updatedAt: new Date().toISOString() } 
          : appointment
      ));
      
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setAppointments(originalAppointments);
        throw new Error('Failed to update appointment status');
      }

      const result = await response.json();
      
      // Update with server response to ensure consistency
      if (result.appointment) {
        setAppointments(prev => prev.map(appointment => 
          appointment.id === appointmentId ? result.appointment : appointment
        ));
      }
      
      return result;
    } catch (err) {
      console.error('Error updating appointment status:', err);
      throw err;
    }
  }, [appointments]);

  // Add clinic
  const addClinic = useCallback(async (clinic: Omit<Clinic, 'id'>) => {
    try {
      const response = await fetch('/api/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(clinic),
      });

      if (!response.ok) throw new Error('Failed to add clinic');
      
      const newClinic = await response.json();
      setClinics(prev => [...prev, newClinic]);
      return newClinic;
    } catch (err) {
      console.error('Error adding clinic:', err);
      // Fallback to local storage
      const newClinic = {
        id: Date.now().toString(),
        ...clinic,
      };
      setClinics(prev => [...prev, newClinic]);
      return newClinic;
    }
  }, []);

  // Delete clinic
  const deleteClinic = useCallback(async (clinicId: string) => {
    try {
      // Optimistic update
      setClinics(prev => prev.filter(c => c.id !== clinicId));
      
      const response = await fetch(`/api/clinics/${clinicId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        // Revert on error
        await fetchData(true, false);
        throw new Error('Failed to delete clinic');
      }
    } catch (err) {
      console.error('Error deleting clinic:', err);
    }
  }, [fetchData]);

  // Manual refresh function - force a full refresh
  const refresh = useCallback(() => {
    if (status === 'authenticated') {
      // Always fetch both active and archived on manual refresh
      return fetchData(true, true);
    }
  }, [fetchData, status]);

  // Refresh only archived cases
  const refreshArchived = useCallback(async () => {
    if (status === 'authenticated' && session?.user?.id) {
      try {
        const response = await fetch('/api/cases?archived=true', { credentials: 'include' });
        if (response.ok) {
          const archivedCasesData = await response.json();
          setArchivedCases(archivedCasesData.cases || []);
        }
      } catch (err) {
        console.error('Error refreshing archived cases:', err);
      }
    }
  }, [status, session?.user?.id]);

  return {
    cases,
    archivedCases,
    appointments,
    clinics,
    selectedClinic,
    loading,
    error,
    setSelectedClinic,
    archiveCase,
    updateCaseStatus,
    addAppointment,
    updateAppointment,
    updateAppointmentStatus,
    addClinic,
    deleteClinic,
    refresh,
    refreshArchived,
  };
};