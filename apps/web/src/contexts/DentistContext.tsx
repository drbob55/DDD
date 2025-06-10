import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Case, Appointment, Clinic, FilterOptions } from '@dental/shared';

// State Types
interface DentistState {
  // Data
  cases: Case[];
  archivedCases: Case[];
  appointments: Appointment[];
  clinics: Clinic[];
  
  // UI State
  selectedClinic: string;
  currentView: 'cases' | 'appointments' | 'archive';
  filters: {
    cases: FilterOptions;
    appointments: FilterOptions;
  };
  
  // Loading States
  loading: {
    cases: boolean;
    appointments: boolean;
    clinics: boolean;
  };
  
  // Error States
  errors: {
    cases: Error | null;
    appointments: Error | null;
    clinics: Error | null;
  };
}

// Action Types
type DentistAction =
  | { type: 'SET_CASES'; payload: Case[] }
  | { type: 'SET_ARCHIVED_CASES'; payload: Case[] }
  | { type: 'SET_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'SET_CLINICS'; payload: Clinic[] }
  | { type: 'SET_SELECTED_CLINIC'; payload: string }
  | { type: 'SET_CURRENT_VIEW'; payload: DentistState['currentView'] }
  | { type: 'UPDATE_CASE'; payload: { id: string; updates: Partial<Case> } }
  | { type: 'UPDATE_APPOINTMENT'; payload: { id: string; updates: Partial<Appointment> } }
  | { type: 'SET_LOADING'; payload: { key: keyof DentistState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof DentistState['errors']; error: Error | null } }
  | { type: 'SET_FILTER'; payload: { type: 'cases' | 'appointments'; filters: Partial<FilterOptions> } }
  | { type: 'RESET_FILTERS'; payload: 'cases' | 'appointments' };

// Initial State
const initialState: DentistState = {
  cases: [],
  archivedCases: [],
  appointments: [],
  clinics: [],
  selectedClinic: '',
  currentView: 'cases',
  filters: {
    cases: {
      searchQuery: '',
      page: 1,
      pageSize: 20
    },
    appointments: {
      searchQuery: '',
      page: 1,
      pageSize: 20
    }
  },
  loading: {
    cases: false,
    appointments: false,
    clinics: false
  },
  errors: {
    cases: null,
    appointments: null,
    clinics: null
  }
};

// Reducer
function dentistReducer(state: DentistState, action: DentistAction): DentistState {
  switch (action.type) {
    case 'SET_CASES':
      return {
        ...state,
        cases: action.payload.filter(c => !c.hiddenByDentist && !c.archivedByDentist),
        archivedCases: action.payload.filter(c => c.hiddenByDentist || c.archivedByDentist)
      };
    
    case 'SET_APPOINTMENTS':
      return { ...state, appointments: action.payload };
    
    case 'SET_CLINICS':
      return { ...state, clinics: action.payload };
    
    case 'SET_SELECTED_CLINIC':
      return { ...state, selectedClinic: action.payload };
    
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    
    case 'UPDATE_CASE':
      return {
        ...state,
        cases: state.cases.map(c => 
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
        archivedCases: state.archivedCases.map(c => 
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        )
      };
    
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(a => 
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        )
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.error }
      };
    
    case 'SET_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.type]: {
            ...state.filters[action.payload.type],
            ...action.payload.filters
          }
        }
      };
    
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload]: initialState.filters[action.payload]
        }
      };
    
    default:
      return state;
  }
}

// Context
interface DentistContextValue extends DentistState {
  // Actions
  setCases: (cases: Case[]) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setClinics: (clinics: Clinic[]) => void;
  setSelectedClinic: (clinicId: string) => void;
  setCurrentView: (view: DentistState['currentView']) => void;
  updateCase: (id: string, updates: Partial<Case>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  setLoading: (key: keyof DentistState['loading'], value: boolean) => void;
  setError: (key: keyof DentistState['errors'], error: Error | null) => void;
  updateFilters: (type: 'cases' | 'appointments', filters: Partial<FilterOptions>) => void;
  resetFilters: (type: 'cases' | 'appointments') => void;
  
  // Computed values
  filteredCases: Case[];
  filteredAppointments: Appointment[];
  stats: {
    totalCases: number;
    activeCases: number;
    completedCases: number;
    upcomingAppointments: number;
  };
}

const DentistContext = createContext<DentistContextValue | undefined>(undefined);

// Provider
export const DentistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dentistReducer, initialState);

  // Actions
  const setCases = useCallback((cases: Case[]) => {
    dispatch({ type: 'SET_CASES', payload: cases });
  }, []);

  const setAppointments = useCallback((appointments: Appointment[]) => {
    dispatch({ type: 'SET_APPOINTMENTS', payload: appointments });
  }, []);

  const setClinics = useCallback((clinics: Clinic[]) => {
    dispatch({ type: 'SET_CLINICS', payload: clinics });
  }, []);

  const setSelectedClinic = useCallback((clinicId: string) => {
    dispatch({ type: 'SET_SELECTED_CLINIC', payload: clinicId });
  }, []);

  const setCurrentView = useCallback((view: DentistState['currentView']) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  }, []);

  const updateCase = useCallback((id: string, updates: Partial<Case>) => {
    dispatch({ type: 'UPDATE_CASE', payload: { id, updates } });
  }, []);

  const updateAppointment = useCallback((id: string, updates: Partial<Appointment>) => {
    dispatch({ type: 'UPDATE_APPOINTMENT', payload: { id, updates } });
  }, []);

  const setLoading = useCallback((key: keyof DentistState['loading'], value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, value } });
  }, []);

  const setError = useCallback((key: keyof DentistState['errors'], error: Error | null) => {
    dispatch({ type: 'SET_ERROR', payload: { key, error } });
  }, []);

  const updateFilters = useCallback((type: 'cases' | 'appointments', filters: Partial<FilterOptions>) => {
    dispatch({ type: 'SET_FILTER', payload: { type, filters } });
  }, []);

  const resetFilters = useCallback((type: 'cases' | 'appointments') => {
    dispatch({ type: 'RESET_FILTERS', payload: type });
  }, []);

  // Computed values
  const filteredCases = React.useMemo(() => {
    const cases = state.currentView === 'archive' ? state.archivedCases : state.cases;
    const { searchQuery, status } = state.filters.cases;
    
    return cases.filter(c => {
      const matchesSearch = !searchQuery || 
        c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.patient.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !status || c.status === status;
      
      return matchesSearch && matchesStatus;
    });
  }, [state.cases, state.archivedCases, state.currentView, state.filters.cases]);

  const filteredAppointments = React.useMemo(() => {
    const { searchQuery, status } = state.filters.appointments;
    
    return state.appointments.filter(apt => {
      const matchesSearch = !searchQuery || 
        apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.caseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !status || apt.status === status;
      
      return matchesSearch && matchesStatus;
    });
  }, [state.appointments, state.filters.appointments]);

  const stats = React.useMemo(() => {
    const now = new Date();
    return {
      totalCases: state.cases.length,
      activeCases: state.cases.filter(c => c.status === 'IN_TREATMENT').length,
      completedCases: state.cases.filter(c => c.status === 'COMPLETED').length,
      upcomingAppointments: state.appointments.filter(
        apt => new Date(apt.date) > now && apt.status === 'SCHEDULED'
      ).length
    };
  }, [state.cases, state.appointments]);

  const value: DentistContextValue = {
    ...state,
    setCases,
    setAppointments,
    setClinics,
    setSelectedClinic,
    setCurrentView,
    updateCase,
    updateAppointment,
    setLoading,
    setError,
    updateFilters,
    resetFilters,
    filteredCases,
    filteredAppointments,
    stats
  };

  return <DentistContext.Provider value={value}>{children}</DentistContext.Provider>;
};

// Hook
export const useDentistContext = () => {
  const context = useContext(DentistContext);
  if (!context) {
    throw new Error('useDentistContext must be used within DentistProvider');
  }
  return context;
};