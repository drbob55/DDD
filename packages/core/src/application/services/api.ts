import { 
  Case, 
  Appointment, 
  Clinic, 
  ApiResponse, 
  PaginatedResponse,
  CaseFormData,
  AppointmentFormData,
  FilterOptions,
  AppError
} from '@dental/shared';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Request interceptor type
type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Apply request interceptors
  private async applyRequestInterceptors(config: RequestInit): Promise<RequestInit> {
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    return finalConfig;
  }

  // Apply response interceptors
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let finalResponse = response;
    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse);
    }
    return finalResponse;
  }

  // Make request
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    let config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    };

    // Apply request interceptors
    config = await this.applyRequestInterceptors(config);

    try {
      let response = await fetch(url, config);
      
      // Apply response interceptors
      response = await this.applyResponseInterceptors(response);

      if (!response.ok) {
        const error = await response.json();
        throw new AppError(
          error.message || 'Request failed',
          error.code || 'API_ERROR',
          response.status,
          error
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response as any;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Network error',
        'NETWORK_ERROR',
        0,
        error
      );
    }
  }

  // HTTP methods
  get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<T>(`${endpoint}${queryString}`, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers: data instanceof FormData ? {} : this.defaultHeaders,
    });
  }

  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create API client instance
const apiClient = new ApiClient();

// Add auth interceptor
apiClient.addRequestInterceptor((config) => {
  // Add auth token if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// Add error logging interceptor
apiClient.addResponseInterceptor(async (response) => {
  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response;
});

// API Service
export const api = {
  // Case endpoints
  cases: {
    list: (filters?: FilterOptions) => 
      apiClient.get<ApiResponse<Case[]>>('/cases', filters),
    
    get: (id: string) => 
      apiClient.get<ApiResponse<Case>>(`/cases/${id}`),
    
    create: (data: FormData) => 
      apiClient.post<ApiResponse<Case>>('/cases', data),
    
    update: (id: string, data: Partial<Case>) => 
      apiClient.patch<ApiResponse<Case>>(`/cases/${id}`, data),
    
    archive: (id: string, archive = true) => 
      apiClient.patch<ApiResponse<Case>>('/cases', {
        caseId: id,
        hiddenByDentist: archive,
        archivedByDentist: archive
      }),
    
    uploadFiles: (caseId: string, files: FormData) => 
      apiClient.post<ApiResponse<any>>(`/cases/${caseId}/files`, files),
    
    delete: (id: string) => 
      apiClient.delete<ApiResponse<void>>(`/cases/${id}`)
  },

  // Appointment endpoints
  appointments: {
    list: (filters?: FilterOptions) => 
      apiClient.get<ApiResponse<Appointment[]>>('/appointments', filters),
    
    get: (id: string) => 
      apiClient.get<ApiResponse<Appointment>>(`/appointments/${id}`),
    
    create: (data: AppointmentFormData) => 
      apiClient.post<ApiResponse<Appointment>>('/appointments', data),
    
    update: (id: string, data: Partial<AppointmentFormData>) => 
      apiClient.put<ApiResponse<Appointment>>(`/appointments/${id}`, data),
    
    cancel: (id: string) => 
      apiClient.delete<ApiResponse<void>>(`/appointments/${id}`),
    
    reschedule: (id: string, newDate: string) => 
      apiClient.patch<ApiResponse<Appointment>>(`/appointments/${id}/reschedule`, { date: newDate })
  },

  // Clinic endpoints
  clinics: {
    list: () => 
      apiClient.get<ApiResponse<{ clinics: Clinic[] }>>('/clinics'),
    
    get: (id: string) => 
      apiClient.get<ApiResponse<Clinic>>(`/clinics/${id}`),
    
    create: (data: Omit<Clinic, 'id'>) => 
      apiClient.post<ApiResponse<Clinic>>('/clinics', data),
    
    update: (id: string, data: Partial<Clinic>) => 
      apiClient.put<ApiResponse<Clinic>>(`/clinics/${id}`, data),
    
    delete: (id: string) => 
      apiClient.delete<ApiResponse<void>>(`/clinics/${id}`)
  },

  // User endpoints
  users: {
    profile: () => 
      apiClient.get<ApiResponse<any>>('/users/profile'),
    
    updateProfile: (data: any) => 
      apiClient.patch<ApiResponse<any>>('/users/profile', data),
    
    changePassword: (data: { currentPassword: string; newPassword: string }) => 
      apiClient.post<ApiResponse<void>>('/users/change-password', data),
    
    checkExists: (email: string) => 
      apiClient.get<ApiResponse<{ exists: boolean; [key: string]: any }>>(`/users/exists`, { email })
  },

  // Analytics endpoints
  analytics: {
    dashboard: () => 
      apiClient.get<ApiResponse<any>>('/analytics/dashboard'),
    
    caseStats: (dateRange?: { start: string; end: string }) => 
      apiClient.get<ApiResponse<any>>('/analytics/cases', dateRange),
    
    appointmentStats: (dateRange?: { start: string; end: string }) => 
      apiClient.get<ApiResponse<any>>('/analytics/appointments', dateRange)
  }
};

// Export types
export type { ApiClient };
export default api;