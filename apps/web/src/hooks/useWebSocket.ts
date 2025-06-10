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

  // Fetch dentist data
  const fetchData = useCallback(async (force: boolean = false) => {
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

      // Fetch all data in parallel
      const [activeCasesRes, archivedCasesRes, appointmentsRes, clinicsRes] = await Promise.all([
        fetch('/api/cases?archived=false', { credentials: 'include' }),
        fetch('/api/cases?archived=true', { credentials: 'include' }),
        fetch('/api/appointments', { credentials: 'include' }),
        fetch('/api/clinics', { credentials: 'include' }).catch(() => null)
      ]);

      // Process active cases
      if (activeCasesRes.ok) {
        const activeCasesData = await activeCasesRes.json();
        setCases(activeCasesData.cases || []);
      }

      // Process archived cases
      if (archivedCasesRes.ok) {
        const archivedCasesData = await archivedCasesRes.json();
        setArchivedCases(archivedCasesData.cases || []);
      }

      // Process appointments
      if (appointmentsRes.ok) {
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
      fetchData(true);
    }
  }, [status, session?.user?.id, fetchData]);

  // Polling effect with smart interval
  useEffect(() => {
    if (options.enablePolling && status === 'authenticated' && session?.user?.id) {
      // Use longer interval, default to 60 seconds
      const interval = setInterval(() => {
        fetchData(false);
      }, options.pollingInterval || 60000);
      
      return () => clearInterval(interval);
    }
  }, [options.enablePolling, options.pollingInterval, status, session?.user?.id, fetchData]);

  // Archive or restore case with optimistic update
  const archiveCase = useCallback(async (caseId: string, archive: boolean) => {
    try {
      // Optimistic update
      if (archive) {
        const caseToArchive = cases.find(c => c.id === caseId);
        if (caseToArchive) {
          setCases(prev => prev.filter(c => c.id !== caseId));
          setArchivedCases(prev => [...prev, { ...caseToArchive, archivedByDentist: true }]);
        }
      } else {
        const caseToRestore = archivedCases.find(c => c.id === caseId);
        if (caseToRestore) {
          setArchivedCases(prev => prev.filter(c => c.id !== caseId));
          setCases(prev => [...prev, { ...caseToRestore, archivedByDentist: false }]);
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
        await fetchData(true);
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to ${archive ? 'archive' : 'restore'} case`);
      }

      return await response.json();
    } catch (err) {
      console.error(`Error ${archive ? 'archiving' : 'restoring'} case:`, err);
      throw err;
    }
  }, [cases, archivedCases, fetchData]);

  // Update case status with optimistic update
  const updateCaseStatus = useCallback(async (caseId: string, status: string) => {
    try {
      // Optimistic update
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, status } : c
      ));
      
      const response = await fetch('/api/cases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ caseId, status }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        await fetchData(true);
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
      }
      
      return result;
    } catch (err) {
      console.error('Error updating case status:', err);
      throw err;
    }
  }, [fetchData]);

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
        await fetchData(true);
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
        await fetchData(true);
        throw new Error('Failed to delete clinic');
      }
    } catch (err) {
      console.error('Error deleting clinic:', err);
    }
  }, [fetchData]);

  // Manual refresh function - force a full refresh
  const refresh = useCallback(() => {
    if (status === 'authenticated') {
      return fetchData(true);
    }
  }, [fetchData, status]);

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
    addClinic,
    deleteClinic,
    refresh,
  };
};