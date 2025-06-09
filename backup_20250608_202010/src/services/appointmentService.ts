// src/services/appointmentService.ts
import { Appointment, AppointmentStatus } from '@/types/appointment.types';

export interface CreateAppointmentData {
  caseId: string;
  date: string;
  clinicId: string;
  clinicName?: string;
  reason: string;
  notes?: string;
  duration?: number;
  patientId: string;
  patientName: string;
  caseNumber: string;
}

export interface UpdateAppointmentData extends Partial<CreateAppointmentData> {
  id: string;
  status?: AppointmentStatus;
}

class AppointmentService {
  private baseUrl = '/api/appointments';

  async getAppointments(filters?: {
    caseId?: string;
    patientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const response = await fetch(`${this.baseUrl}?${params}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }
    
    return response.json();
  }

  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create appointment');
    }
    
    return response.json();
  }

  async updateAppointment(data: UpdateAppointmentData): Promise<Appointment> {
    const response = await fetch(this.baseUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update appointment');
    }
    
    return response.json();
  }

  async updateStatus(appointmentId: string, status: AppointmentStatus): Promise<Appointment> {
    return this.updateAppointment({ id: appointmentId, status });
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${appointmentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel appointment');
    }
  }
}

export const appointmentService = new AppointmentService();