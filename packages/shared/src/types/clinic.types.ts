export interface Clinic {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  operatingHours?: string | null;
  isActive: boolean;
  acceptsWalkIns: boolean;
  dentistId: string;
  createdAt: Date;
  updatedAt: Date;
}
