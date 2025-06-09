// lib/api/appointments.ts

export interface Appointment {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName: string;
  patientId: string;
  date: string | Date;
  clinic: string;
  clinicName: string;
  reason: string;
  treatmentStatus: string;
  patientSince: string;
  notes?: string;
  status?: string;
  dentistName?: string;
}

export interface CreateAppointmentData {
  caseId: string;
  date: string;
  clinicId: string;
  clinicName: string;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentData {
  date?: string;
  clinicId?: string;
  clinicName?: string;
  reason?: string;
  notes?: string;
  status?: string;
}

export class AppointmentsAPI {
  static async getAll(filters?: {
    caseId?: string;
    patientId?: string;
    dentistId?: string;
  }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.caseId) params.append('caseId', filters.caseId);
    if (filters?.patientId) params.append('patientId', filters.patientId);
    if (filters?.dentistId) params.append('dentistId', filters.dentistId);

    const response = await fetch(`/api/appointments?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }

    const data = await response.json();
    // Handle both array response and object with appointments property
    return Array.isArray(data) ? data : data.appointments || [];
  }

  static async getById(id: string): Promise<Appointment> {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appointment');
    }

    const data = await response.json();
    // Handle both direct response and wrapped response
    return data.appointment || data;
  }

  static async create(data: CreateAppointmentData): Promise<Appointment> {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create appointment');
    }

    const result = await response.json();
    return result.appointment || result;
  }

  static async update(id: string, data: UpdateAppointmentData): Promise<Appointment> {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update appointment');
    }

    const result = await response.json();
    return result.appointment || result;
  }

  static async cancel(id: string): Promise<void> {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel appointment');
    }
  }

  // Helper to format appointment for display
  static formatAppointment(appointment: any): Appointment {
    return {
      id: appointment.id,
      caseId: appointment.caseId || appointment.case?.id,
      caseNumber: appointment.caseNumber || appointment.case?.caseNumber || '',
      patientName: appointment.patientName || 
                   appointment.user?.name || 
                   appointment.case?.patient?.name || 
                   `${appointment.case?.patient?.firstName} ${appointment.case?.patient?.lastName}`,
      patientId: appointment.patientId || appointment.userId || appointment.case?.patient?.id,
      date: appointment.date,
      clinic: appointment.clinic || appointment.clinicId || '1',
      clinicName: appointment.clinicName || 'Main Clinic',
      reason: appointment.reason || 'Follow-up appointment',
      treatmentStatus: appointment.treatmentStatus || appointment.case?.status || 'IN_TREATMENT',
      patientSince: appointment.patientSince || appointment.user?.createdAt || new Date().toISOString(),
      notes: appointment.notes,
      status: appointment.status || 'SCHEDULED',
      dentistName: appointment.dentistName || appointment.case?.dentist?.name,
    };
  }
}