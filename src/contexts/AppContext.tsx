import { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export type UserRole = 'admin' | 'recep' | 'kinesio';

export interface AppState {
  currentWeek: Date;
  userRole: UserRole;
  isDemoMode: boolean;
  selectedClinic?: string;
  searchQuery: string;
  patients: Patient[];
  practitioners: Practitioner[];
  appointments: Appointment[];
  isAuthenticated: boolean;
  currentUser?: User;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  conditions: string[];
  lastVisit?: string;
  nextAppointment?: string;
}

export interface Practitioner {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  schedule: Schedule[];
}

export interface Appointment {
  id: string;
  patientId: string;
  practitionerId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'consultation' | 'therapy' | 'follow-up';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
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
  | { type: 'SET_USER_ROLE'; payload: UserRole }
  | { type: 'TOGGLE_DEMO_MODE' }
  | { type: 'SET_SELECTED_CLINIC'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SEED_DEMO_DATA' }
  | { type: 'CLEAR_DEMO_DATA' }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_PATIENT'; payload: Patient }
  | { type: 'UPDATE_PATIENT'; payload: { id: string; updates: Partial<Patient> } }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: { id: string; updates: Partial<Appointment> } };

// Initial State
const initialState: AppState = {
  currentWeek: new Date(),
  userRole: 'admin',
  isDemoMode: false,
  searchQuery: '',
  patients: [],
  practitioners: [],
  appointments: [],
  isAuthenticated: false,
};

// Reducer
export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CURRENT_WEEK':
      return { ...state, currentWeek: action.payload };
    
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    
    case 'TOGGLE_DEMO_MODE':
      return { ...state, isDemoMode: !state.isDemoMode };
    
    case 'SET_SELECTED_CLINIC':
      return { ...state, selectedClinic: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SEED_DEMO_DATA':
      return {
        ...state,
        patients: getDemoPatients(),
        practitioners: getDemoPractitioners(),
        appointments: getDemoAppointments(),
      };
    
    case 'CLEAR_DEMO_DATA':
      return {
        ...state,
        patients: [],
        practitioners: [],
        appointments: [],
      };
    
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        currentUser: action.payload,
        userRole: action.payload.role,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        currentUser: undefined,
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
    
    case 'ADD_APPOINTMENT':
      return {
        ...state,
        appointments: [...state.appointments, action.payload],
      };
    
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        ),
      };
    
    default:
      return state;
  }
};

// Demo Data Generators
const getDemoPatients = (): Patient[] => [
  {
    id: '1',
    name: 'María González',
    email: 'maria.gonzalez@email.com',
    phone: '+54 11 1234-5678',
    birthDate: '1985-03-15',
    conditions: ['Dolor de espalda', 'Lesión de rodilla'],
    lastVisit: '2024-08-15',
    nextAppointment: '2024-08-25',
  },
  {
    id: '2',
    name: 'Carlos Rodriguez',
    email: 'carlos.rodriguez@email.com',
    phone: '+54 11 8765-4321',
    birthDate: '1978-11-22',
    conditions: ['Rehabilitación post-cirugía'],
    lastVisit: '2024-08-18',
  },
  {
    id: '3',
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    phone: '+54 11 5555-9999',
    birthDate: '1992-07-08',
    conditions: ['Fisioterapia respiratoria'],
    nextAppointment: '2024-08-24',
  },
];

const getDemoPractitioners = (): Practitioner[] => [
  {
    id: '1',
    name: 'Dr. Juan Pérez',
    specialty: 'Traumatología',
    email: 'juan.perez@clinic.com',
    phone: '+54 11 1111-2222',
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', isAvailable: true },
      { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', isAvailable: true },
      { dayOfWeek: 5, startTime: '08:00', endTime: '16:00', isAvailable: true },
    ],
  },
  {
    id: '2',
    name: 'Lic. Carmen López',
    specialty: 'Kinesiología',
    email: 'carmen.lopez@clinic.com',
    phone: '+54 11 3333-4444',
    schedule: [
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isAvailable: true },
    ],
  },
];

const getDemoAppointments = (): Appointment[] => [
  {
    id: '1',
    patientId: '1',
    practitionerId: '1',
    date: '2024-08-25',
    startTime: '10:00',
    endTime: '11:00',
    type: 'consultation',
    status: 'scheduled',
    notes: 'Seguimiento de lesión de rodilla',
  },
  {
    id: '2',
    patientId: '3',
    practitionerId: '2',
    date: '2024-08-24',
    startTime: '14:00',
    endTime: '15:00',
    type: 'therapy',
    status: 'scheduled',
    notes: 'Sesión de fisioterapia respiratoria',
  },
];

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

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

// Demo Helpers
export const seedDemo = (dispatch: React.Dispatch<AppAction>) => {
  dispatch({ type: 'SEED_DEMO_DATA' });
};

export const clearDemo = (dispatch: React.Dispatch<AppAction>) => {
  dispatch({ type: 'CLEAR_DEMO_DATA' });
};