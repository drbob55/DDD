export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateClinicRequest {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface ClinicResponse {
  success: boolean;
  clinic?: Clinic;
  clinics?: Clinic[];
  count?: number;
  message?: string;
  error?: string;
}
