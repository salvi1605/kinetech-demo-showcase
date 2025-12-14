import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { addWeeks, subWeeks, format } from 'date-fns';
import type { TreatmentType } from '@/types/appointments';
import type { EvolutionEntry } from '@/types/patient';
import { supabase } from '@/integrations/supabase/client';

// Types
export type UserRole = 'admin' | 'recep' | 'kinesio' | 'tenant_owner';

export interface Preferences {
  timezone: string;
  weekStartsOn: number;
  slotMinutes: number;
  showWeekends: boolean;
  gridSize: 'sm' | 'md' | 'lg';
  multiTenant?: boolean;
}

export interface Availability {
  id: string;
  practitionerId: string;
  weekday: number; // 0-6
  from: string; // "08:00"
  to: string; // "18:00"
  slotMinutes: number;
  capacity: number;
}

export interface Exception {
  id: string;
  date: string; // "2025-01-01"
  closed?: boolean;
  extraSlots?: { from: string; to: string }[];
}

export interface AppState {
  currentWeek: Date;
  calendarWeekStart?: string; // ISO date string for calendar week start
  userRole: UserRole;
  isDemoMode: boolean;
  selectedClinic?: string;
  currentClinicId?: string;
  currentClinicName?: string;
  searchQuery: string;
  sidebarExpanded: boolean;
  patients: Patient[];
  practitioners: Practitioner[];
  appointments: Appointment[];
  appointmentsById: Record<string, Appointment>;
  appointmentsBySlotKey: Map<string, Appointment>;
  availability: Availability[];
  exceptions: Exception[];
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  currentUser?: User;
  preferences: Preferences;
  selectedSlots: Set<string>;
  selectedPractitionerId?: string;
  selectedTreatmentType?: TreatmentType;
  filterPractitionerId?: string; // Para filtrar visualización del calendario por profesional
  filterPatientSearch?: string; // Para filtrar visualización del calendario por paciente
  currentUserId: string;
  currentUserName: string;
  testCurrentDate?: string; // YYYY-MM-DD - For testing purposes only
}

export type PatientDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
};

export type PatientHistoryEntry = {
  date: string; // 'YYYY-MM-DD'
  text: string;
  authorId: string;
  authorName?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type DailySummary = {
  date: string; // 'YYYY-MM-DD'
  text: string;
  authorId: string;
  updatedAtISO: string;
};

export type ClinicalSummaryDay = {
  date: string; // 'YYYY-MM-DD'
  clinicalData: {
    mainReason?: string;
    diagnosis?: string;
    laterality?: 'Derecha' | 'Izquierda' | 'Bilateral' | '';
    painLevel?: number; // 0-10
    redFlags?: {
      embarazo: boolean;
      cancer: boolean;
      marcapasos: boolean;
      alergias: boolean;
    };
    redFlagsDetail?: {
      alergias?: string;
    };
    restricciones?: {
      noMagnetoterapia: boolean;
      noElectroterapia: boolean;
    };
  };
  authorId: string;
  updatedAt: string; // ISO
};

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  conditions: string[];
  lastVisit?: string;
  nextAppointment?: string;
  documents?: PatientDocument[];
  // Extended fields from patient form
  identificacion?: {
    fullName: string;
    preferredName?: string;
    documentId?: string;
    dateOfBirth?: string;
    mobilePhone: string;
    email: string;
  };
  emergencia?: {
    contactName: string;
    relationship?: string;
    emergencyPhone: string;
  };
  clinico?: {
    mainReason?: string;
    diagnosis?: string;
    laterality?: string;
    painLevel?: number;
    redFlags?: { embarazo: boolean; cancer: boolean; marcapasos: boolean; alergias: boolean; };
    redFlagsDetail?: { alergias: string; };
    restricciones?: { noMagnetoterapia: boolean; noElectroterapia: boolean; };
    history?: PatientHistoryEntry[]; // Legacy: conservar sin borrar
    historyByAppointment?: EvolutionEntry[]; // Nuevo: por cita
  };
  history?: {
    summaries?: DailySummary[]; // Resumen clínico por día (texto libre)
    clinicalSummaries?: ClinicalSummaryDay[]; // Snapshots estructurados del clínico por día
  };
  seguro?: {
    obraSocial?: string;
    numeroAfiliado?: string;
    sesionesAutorizadas?: number;
    copago?: number;
    contactAuth?: { whatsapp: boolean; email: boolean; };
    reminderPref?: string;
  };
}

export interface Practitioner {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  schedule: Schedule[];
  color: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  practitionerId: string;
  date: string;
  startTime: string;
  type: 'consultation' | 'therapy' | 'follow-up';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  subSlot: 1 | 2 | 3 | 4 | 5;
  treatmentType: TreatmentType;
  isContinuation?: boolean;          // true si es la segunda media hora
  primaryAppointmentId?: string;     // id de la primaria (si continuation)
}

export interface Schedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicId: string;
}

// Action Types
export type AppAction =
  | { type: 'SET_CURRENT_WEEK'; payload: Date }
  | { type: 'SET_CALENDAR_WEEK'; payload: string } // ISO date string
  | { type: 'SET_USER_ROLE'; payload: UserRole }
  | { type: 'TOGGLE_DEMO_MODE' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SELECTED_CLINIC'; payload: string }
  | { type: 'SET_CURRENT_CLINIC'; payload: { id: string; name: string } }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_PRACTITIONER'; payload: string | undefined }
  | { type: 'SET_SELECTED_TREATMENT_TYPE'; payload: TreatmentType | undefined }
  | { type: 'SET_FILTER_PRACTITIONER'; payload: string | undefined }
  | { type: 'SET_FILTER_PATIENT_SEARCH'; payload: string | undefined }
  | { type: 'SEED_DEMO_DATA' }
  | { type: 'CLEAR_DEMO_DATA' }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'ADD_PATIENT'; payload: Patient }
  | { type: 'UPDATE_PATIENT'; payload: { id: string; updates: Partial<Patient> } }
  | { type: 'DELETE_PATIENT'; payload: string }
  | { type: 'ADD_PRACTITIONER'; payload: Practitioner }
  | { type: 'UPDATE_PRACTITIONER'; payload: Practitioner }
  | { type: 'SET_PRACTITIONERS'; payload: Practitioner[] }
  | { type: 'SET_PATIENTS'; payload: Patient[] }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: { id: string; updates: Partial<Appointment> } }
  | { type: 'UPDATE_APPOINTMENT_DIRECT'; payload: Appointment }
  | { type: 'DELETE_APPOINTMENT'; payload: string }
  | { type: 'TOGGLE_SLOT_SELECTION'; payload: string }
  | { type: 'CLEAR_SLOT_SELECTION' }
  | { type: 'ADD_MULTIPLE_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'DELETE_APPOINTMENTS_BULK'; payload: { patientId: string; fromDateTime: string; statuses: string[] } }
  | { type: 'AUTO_NO_ASISTIO'; payload: string[] }
  | { type: 'SET_TEST_DATE'; payload: string | undefined };

// Utility functions for appointment indexing
const getSlotKey = (appointment: Appointment): string => {
  return `${appointment.date}:${appointment.startTime}:S${appointment.subSlot}`;
};

const buildAppointmentIndexes = (appointments: Appointment[]) => {
  const appointmentsById: Record<string, Appointment> = {};
  const appointmentsBySlotKey = new Map<string, Appointment>();
  
  appointments.forEach(apt => {
    appointmentsById[apt.id] = apt;
    appointmentsBySlotKey.set(getSlotKey(apt), apt);
  });
  
  return { appointmentsById, appointmentsBySlotKey };
};

// Helper para leer filtro de localStorage
const getStoredFilterPractitionerId = (): string | undefined => {
  try {
    const stored = localStorage.getItem('filterPractitionerId');
    return stored || undefined;
  } catch {
    return undefined;
  }
};

// Helper para leer filtro de paciente de localStorage
const getStoredFilterPatientSearch = (): string | undefined => {
  try {
    const stored = localStorage.getItem('filterPatientSearch');
    return stored || undefined;
  } catch {
    return undefined;
  }
};

// Initial State
const initialState: AppState = {
  currentWeek: new Date(),
  userRole: 'admin',
  isDemoMode: false,
  searchQuery: '',
  sidebarExpanded: true,
  patients: [],
  practitioners: [],
  appointments: [],
  appointmentsById: {},
  appointmentsBySlotKey: new Map(),
  availability: [],
  exceptions: [],
  isAuthenticated: false,
  isLoadingAuth: true,
  preferences: {
    timezone: 'America/Argentina/Buenos_Aires',
    weekStartsOn: 1,
    slotMinutes: 30,
    showWeekends: false,
    gridSize: 'md',
    multiTenant: false,
  },
  selectedSlots: new Set<string>(),
  currentUserId: '',
  currentUserName: '',
  testCurrentDate: undefined,
  filterPractitionerId: getStoredFilterPractitionerId(),
  filterPatientSearch: getStoredFilterPatientSearch(),
};

// Reducer
export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CURRENT_WEEK':
      return { ...state, currentWeek: action.payload };
    
    case 'SET_CALENDAR_WEEK':
      return { ...state, calendarWeekStart: action.payload };
    
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    
    case 'TOGGLE_DEMO_MODE':
      return { ...state, isDemoMode: !state.isDemoMode };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarExpanded: !state.sidebarExpanded };
    
    case 'SET_SELECTED_CLINIC':
      return { ...state, selectedClinic: action.payload };
    
    case 'SET_CURRENT_CLINIC':
      // Limpiar ambos filtros al cambiar de clínica
      try { localStorage.removeItem('filterPractitionerId'); } catch {}
      try { localStorage.removeItem('filterPatientSearch'); } catch {}
      return { 
        ...state, 
        currentClinicId: action.payload.id,
        currentClinicName: action.payload.name,
        selectedClinic: action.payload.id,
        filterPractitionerId: undefined,
        filterPatientSearch: undefined,
      };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SELECTED_PRACTITIONER':
      return { ...state, selectedPractitionerId: action.payload };
    
    case 'SET_SELECTED_TREATMENT_TYPE':
      return { ...state, selectedTreatmentType: action.payload };
    
    case 'SET_FILTER_PRACTITIONER':
      // Persistir en localStorage
      if (action.payload) {
        try { localStorage.setItem('filterPractitionerId', action.payload); } catch {}
      } else {
        try { localStorage.removeItem('filterPractitionerId'); } catch {}
      }
      return { ...state, filterPractitionerId: action.payload };
    
    case 'SET_FILTER_PATIENT_SEARCH':
      // Persistir en localStorage
      if (action.payload) {
        try { localStorage.setItem('filterPatientSearch', action.payload); } catch {}
      } else {
        try { localStorage.removeItem('filterPatientSearch'); } catch {}
      }
      return { ...state, filterPatientSearch: action.payload };
    
    case 'SEED_DEMO_DATA': {
      // Demo data eliminado - ahora todo viene de BD
      return state;
    }
    
    case 'CLEAR_DEMO_DATA':
      return {
        ...state,
        patients: [],
        practitioners: [],
        appointments: [],
        appointmentsById: {},
        appointmentsBySlotKey: new Map(),
        availability: [],
        exceptions: [],
      };
    
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        isLoadingAuth: false,
        currentUser: action.payload,
        userRole: action.payload.role,
        currentUserId: action.payload.id,
        currentUserName: action.payload.name,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        isLoadingAuth: false,
        currentUser: undefined,
        currentUserId: '',
        currentUserName: '',
      };
    
    case 'SET_AUTH_LOADING':
      return {
        ...state,
        isLoadingAuth: action.payload,
      };
    
    case 'ADD_PATIENT':
      return {
        ...state,
        patients: [...state.patients, action.payload],
      };
    
    case 'UPDATE_PATIENT':
      return {
        ...state,
        patients: state.patients.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };
    
    case 'DELETE_PATIENT':
      return {
        ...state,
        patients: state.patients.filter(p => p.id !== action.payload),
      };
    
    case 'ADD_PRACTITIONER':
      return {
        ...state,
        practitioners: [...state.practitioners, action.payload],
      };
    
    case 'UPDATE_PRACTITIONER':
      return {
        ...state,
        practitioners: state.practitioners.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    
    case 'SET_PRACTITIONERS':
      return {
        ...state,
        practitioners: action.payload,
      };
    
    case 'SET_PATIENTS':
      return {
        ...state,
        patients: action.payload,
      };
    
    case 'ADD_APPOINTMENT': {
      // Validación: rechazar inicio > 19:00
      if (action.payload.startTime > '19:00') {
        console.warn('Rechazado: inicio > 19:00', action.payload);
        return state;
      }
      const newAppointments = [...state.appointments, action.payload];
      const indexes = buildAppointmentIndexes(newAppointments);
      return {
        ...state,
        appointments: newAppointments,
        appointmentsById: indexes.appointmentsById,
        appointmentsBySlotKey: indexes.appointmentsBySlotKey,
      };
    }
    
    case 'UPDATE_APPOINTMENT': {
      const updatedAppointments = state.appointments.map(a =>
        a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
      );
      
      const indexes = buildAppointmentIndexes(updatedAppointments);
      return {
        ...state,
        appointments: updatedAppointments,
        appointmentsById: indexes.appointmentsById,
        appointmentsBySlotKey: indexes.appointmentsBySlotKey,
      };
    }
    
    case 'UPDATE_APPOINTMENT_DIRECT': {
      const updatedAppointments = state.appointments.map(a =>
        a.id === action.payload.id ? action.payload : a
      );
      const indexes = buildAppointmentIndexes(updatedAppointments);
      return {
        ...state,
        appointments: updatedAppointments,
        appointmentsById: indexes.appointmentsById,
        appointmentsBySlotKey: indexes.appointmentsBySlotKey,
      };
    }
    
    case 'DELETE_APPOINTMENT': {
      const filteredAppointments = state.appointments.filter(a => a.id !== action.payload);
      const indexes = buildAppointmentIndexes(filteredAppointments);
      return {
        ...state,
        appointments: filteredAppointments,
        appointmentsById: indexes.appointmentsById,
        appointmentsBySlotKey: indexes.appointmentsBySlotKey,
      };
    }
    
    case 'TOGGLE_SLOT_SELECTION':
      const newSelectedSlots = new Set(state.selectedSlots);
      if (newSelectedSlots.has(action.payload)) {
        newSelectedSlots.delete(action.payload);
      } else {
        newSelectedSlots.add(action.payload);
      }
      return {
        ...state,
        selectedSlots: newSelectedSlots,
      };
    
    case 'CLEAR_SLOT_SELECTION':
      return {
        ...state,
        selectedSlots: new Set<string>(),
        selectedPractitionerId: undefined,
        selectedTreatmentType: undefined,
      };
    
    case 'ADD_MULTIPLE_APPOINTMENTS': {
      // Filtrar citas con inicio > 19:00
      const validAppointments = action.payload.filter(apt => {
        if (apt.startTime > '19:00') {
          console.warn('Rechazado en masiva: inicio > 19:00', apt);
          return false;
        }
        
        // OPCIÓN 4: Validación de seguridad en reducer
        // Rechazar si ya existe una cita en el mismo slot (cualquier doctor)
        const hasConflict = state.appointments.some(existingApt =>
          existingApt.date === apt.date &&
          existingApt.startTime === apt.startTime &&
          existingApt.subSlot === apt.subSlot
        );
        
        if (hasConflict) {
          console.warn('Rechazado en reducer: slot ya ocupado', {
            date: apt.date,
            time: apt.startTime,
            subSlot: apt.subSlot,
            practitioner: apt.practitionerId
          });
          return false;
        }
        
        return true;
      });
      const newAppointments = [...state.appointments, ...validAppointments];
      const indexes = buildAppointmentIndexes(newAppointments);
      return {
        ...state,
        appointments: newAppointments,
        appointmentsById: indexes.appointmentsById,
        appointmentsBySlotKey: indexes.appointmentsBySlotKey,
      };
    }
    
    case 'AUTO_NO_ASISTIO': {
      const aptIdsToUpdate = action.payload;
      const updatedAppointments = state.appointments.map(apt =>
        aptIdsToUpdate.includes(apt.id) ? { ...apt, status: 'cancelled' as const } : apt
      );
      const indexes = buildAppointmentIndexes(updatedAppointments);
      return {
        ...state,
        appointments: updatedAppointments,
        appointmentsById: indexes.appointmentsById,
        appointmentsBySlotKey: indexes.appointmentsBySlotKey,
      };
    }

    case 'DELETE_APPOINTMENTS_BULK': {
      const { patientId, fromDateTime, statuses } = action.payload;
      const filteredAppointments = state.appointments.filter(apt => {
        // Solo eliminar citas que coincidan con los criterios
        if (apt.patientId !== patientId) return true;
        if (!statuses.includes(apt.status)) return true;
        
        // Comparar fecha/hora local sin crear Date object
        const aptDateTime = `${apt.date}T${apt.startTime}:00`;
        return aptDateTime < fromDateTime;
      });
      
      const indexes = buildAppointmentIndexes(filteredAppointments);
      
      return {
        ...state,
        appointments: filteredAppointments,
        appointmentsById: indexes.appointmentsById,
        appointmentsBySlotKey: indexes.appointmentsBySlotKey,
        selectedSlots: new Set<string>(), // Limpiar selección
      };
    }
    
    case 'SET_TEST_DATE':
      return {
        ...state,
        testCurrentDate: action.payload,
      };
    
    default:
      return state;
  }
};

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Helper function to get user clinics and check count
const getUserClinicsFromDB = async (authUserId: string): Promise<{ clinics: any[]; userId: string } | null> => {
  try {
    // Get user from public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, auth_user_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return null;
    }

    // Get all user roles/clinics
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        clinic_id,
        clinics:clinic_id (
          id,
          name
        )
      `)
      .eq('user_id', userData.id)
      .eq('active', true);

    if (roleError) {
      console.error('Error fetching user roles:', roleError);
      return null;
    }

    return { 
      clinics: userRoles || [],
      userId: userData.id,
    };
  } catch (error) {
    console.error('Error in getUserClinicsFromDB:', error);
    return null;
  }
};

// Helper function to get user role from database
const getUserRoleFromDB = async (authUserId: string, clinicId?: string): Promise<{ user: User; clinicId: string; clinicName: string } | null> => {
  try {
    // Get user from public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, auth_user_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return null;
    }

    // Build query for user role
    let query = supabase
      .from('user_roles')
      .select(`
        role_id, 
        clinic_id,
        clinics:clinic_id (
          id,
          name
        )
      `)
      .eq('user_id', userData.id)
      .eq('active', true);

    // If clinicId provided, filter by it
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data: roleData, error: roleError } = await query.single();

    if (roleError || !roleData) {
      console.error('Error fetching user role:', roleError);
      return null;
    }

    // Map database role to app role
    let appRole: UserRole = 'recep';
    if (roleData.role_id === 'tenant_owner') {
      appRole = 'tenant_owner';
    } else if (roleData.role_id === 'admin_clinic') {
      appRole = 'admin';
    } else if (roleData.role_id === 'receptionist') {
      appRole = 'recep';
    } else if (roleData.role_id === 'health_pro') {
      appRole = 'kinesio';
    }

    const user: User = {
      id: userData.id,
      name: userData.full_name,
      email: userData.email,
      role: appRole,
      clinicId: roleData.clinic_id,
    };

    return { 
      user, 
      clinicId: roleData.clinic_id,
      clinicName: (roleData.clinics as any)?.name || 'Sin nombre',
    };
  } catch (error) {
    console.error('Error in getUserRoleFromDB:', error);
    return null;
  }
};

// Provider
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Defer database calls to avoid blocking
          setTimeout(async () => {
            // Check user's clinics
            const clinicsResult = await getUserClinicsFromDB(session.user.id);
            
            if (!clinicsResult || clinicsResult.clinics.length === 0) {
              // No clinics - but still authenticated, will be redirected to create clinic page
              // Create minimal user object for authentication
              const { data: userData } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('auth_user_id', session.user.id)
                .single();
              
              if (userData) {
                dispatch({ 
                  type: 'LOGIN', 
                  payload: { 
                    id: userData.id, 
                    name: userData.full_name, 
                    email: userData.email,
                    role: 'admin', // Default role until clinic is selected
                    clinicId: undefined
                  } 
                });
              }
              dispatch({ type: 'SET_AUTH_LOADING', payload: false });
            } else if (clinicsResult.clinics.length === 1) {
              // Single clinic - auto-select it
              const clinic = clinicsResult.clinics[0];
              const result = await getUserRoleFromDB(session.user.id, clinic.clinic_id);
              
              if (result) {
                dispatch({ type: 'LOGIN', payload: result.user });
                dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: result.clinicId, name: result.clinicName } });
              }
              dispatch({ type: 'SET_AUTH_LOADING', payload: false });
            } else {
              // Multiple clinics - user authenticated but needs to select clinic
              const { data: userData } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('auth_user_id', session.user.id)
                .single();
              
              if (userData) {
                dispatch({ 
                  type: 'LOGIN', 
                  payload: { 
                    id: userData.id, 
                    name: userData.full_name, 
                    email: userData.email,
                    role: 'admin', // Temp role until clinic is selected
                    clinicId: undefined
                  } 
                });
              }
              dispatch({ type: 'SET_AUTH_LOADING', payload: false });
            }
          }, 0);
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const clinicsResult = await getUserClinicsFromDB(session.user.id);
        
        if (!clinicsResult || clinicsResult.clinics.length === 0) {
          // No clinics
          dispatch({ type: 'SET_AUTH_LOADING', payload: false });
        } else if (clinicsResult.clinics.length === 1) {
          // Single clinic - auto-select it
          const clinic = clinicsResult.clinics[0];
          const result = await getUserRoleFromDB(session.user.id, clinic.clinic_id);
          
          if (result) {
            dispatch({ type: 'LOGIN', payload: result.user });
            dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: result.clinicId, name: result.clinicName } });
          }
          dispatch({ type: 'SET_AUTH_LOADING', payload: false });
        } else {
          // Multiple clinics - will be redirected to select clinic page
          dispatch({ type: 'SET_AUTH_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Demo helpers (deprecated - data now comes from DB)
export const seedDemo = (_dispatch: React.Dispatch<AppAction>) => {
  console.warn('seedDemo is deprecated. Data now comes from database.');
};

export const clearDemo = (_dispatch: React.Dispatch<AppAction>) => {
  console.warn('clearDemo is deprecated. Data now comes from database.');
};

// Helper function to update a single appointment immutably
export const updateAppointment = (dispatch: React.Dispatch<AppAction>, appointment: Appointment) => {
  dispatch({ type: 'UPDATE_APPOINTMENT_DIRECT', payload: appointment });
};

// Auto No Asistió utilities
const todayISO = () => format(new Date(), 'yyyy-MM-dd');
const isPastDay = (dateISO: string) => dateISO < todayISO();

export const runAutoNoAsistio = (dispatch: React.Dispatch<AppAction>, appointments: Appointment[], refISO?: string) => {
  const referenceDate = refISO ?? todayISO();
  const toUpdate = appointments.filter(a => a.status === 'scheduled' && a.date < referenceDate);
  
  if (toUpdate.length === 0) return 0;
  
  dispatch({ type: 'AUTO_NO_ASISTIO', payload: toUpdate.map(a => a.id) });
  return toUpdate.length;
};