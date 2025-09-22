import { createContext, useContext, useReducer, ReactNode } from 'react';
import { addWeeks, subWeeks, format } from 'date-fns';

// Types
export type UserRole = 'admin' | 'recep' | 'kinesio';

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
  userRole: UserRole;
  isDemoMode: boolean;
  selectedClinic?: string;
  searchQuery: string;
  sidebarExpanded: boolean;
  patients: Patient[];
  practitioners: Practitioner[];
  appointments: Appointment[];
  availability: Availability[];
  exceptions: Exception[];
  isAuthenticated: boolean;
  currentUser?: User;
  preferences: Preferences;
  selectedSlots: Set<string>;
  selectedPractitionerId?: string;
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
  color: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  practitionerId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'consultation' | 'therapy' | 'follow-up';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  slotIndex?: number;
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
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SELECTED_CLINIC'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_PRACTITIONER'; payload: string | undefined }
  | { type: 'SEED_DEMO_DATA' }
  | { type: 'CLEAR_DEMO_DATA' }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_PATIENT'; payload: Patient }
  | { type: 'UPDATE_PATIENT'; payload: { id: string; updates: Partial<Patient> } }
  | { type: 'DELETE_PATIENT'; payload: string }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: { id: string; updates: Partial<Appointment> } }
  | { type: 'DELETE_APPOINTMENT'; payload: string }
  | { type: 'TOGGLE_SLOT_SELECTION'; payload: string }
  | { type: 'CLEAR_SLOT_SELECTION' }
  | { type: 'ADD_MULTIPLE_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'DELETE_APPOINTMENTS_BULK'; payload: { patientId: string; fromDateTime: string; statuses: string[] } };

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
  availability: [],
  exceptions: [],
  isAuthenticated: false,
  preferences: {
    timezone: 'America/Argentina/Buenos_Aires',
    weekStartsOn: 1,
    slotMinutes: 30,
    showWeekends: false,
    gridSize: 'md',
    multiTenant: false,
  },
  selectedSlots: new Set<string>(),
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
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarExpanded: !state.sidebarExpanded };
    
    case 'SET_SELECTED_CLINIC':
      return { ...state, selectedClinic: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SELECTED_PRACTITIONER':
      return { ...state, selectedPractitionerId: action.payload };
    
    case 'SEED_DEMO_DATA':
      return {
        ...state,
        patients: getDemoPatients(),
        practitioners: getDemoPractitioners(),
        appointments: getDemoAppointments(),
        availability: getDemoAvailability(),
        exceptions: getDemoExceptions(),
      };
    
    case 'CLEAR_DEMO_DATA':
      return {
        ...state,
        patients: [],
        practitioners: [],
        appointments: [],
        availability: [],
        exceptions: [],
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
    
    case 'DELETE_PATIENT':
      return {
        ...state,
        patients: state.patients.filter(p => p.id !== action.payload),
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
    
    case 'DELETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.filter(a => a.id !== action.payload),
      };
    
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
        selectedPractitionerId: undefined, // Reset practitioner selection when clearing slots
      };
    
    case 'ADD_MULTIPLE_APPOINTMENTS':
      return {
        ...state,
        appointments: [...state.appointments, ...action.payload],
      };
    
    case 'DELETE_APPOINTMENTS_BULK':
      const { patientId, fromDateTime, statuses } = action.payload;
      const filteredAppointments = state.appointments.filter(apt => {
        // Solo eliminar citas que coincidan con los criterios
        if (apt.patientId !== patientId) return true;
        if (!statuses.includes(apt.status)) return true;
        
        // Comparar fecha/hora local sin crear Date object
        const aptDateTime = `${apt.date}T${apt.startTime}:00`;
        return aptDateTime < fromDateTime;
      });
      
      return {
        ...state,
        appointments: filteredAppointments,
        selectedSlots: new Set<string>(), // Limpiar selección
      };
    
    default:
      return state;
  }
};

// Demo Data Generators
const getDemoPatients = (): Patient[] => [
  {
    id: '1',
    name: 'María González García',
    email: 'maria.gonzalez@email.com',
    phone: '+54 11 1234-5678',
    birthDate: '1985-03-15',
    conditions: ['Dolor de espalda', 'Lesión de rodilla'],
    lastVisit: '2024-08-15',
    nextAppointment: '2024-08-25',
  },
  {
    id: '2',
    name: 'Carlos Rodríguez Pérez',
    email: 'carlos.rodriguez@email.com',
    phone: '+54 11 8765-4321',
    birthDate: '1978-11-22',
    conditions: ['Rehabilitación post-cirugía'],
    lastVisit: '2024-08-18',
  },
  {
    id: '3',
    name: 'Ana Silva Martínez',
    email: 'ana.silva@email.com',
    phone: '+54 11 5555-9999',
    birthDate: '1992-07-08',
    conditions: ['Fisioterapia respiratoria'],
    nextAppointment: '2024-08-24',
  },
  {
    id: '4',
    name: 'Juan Alberto Fernández',
    email: 'juan.fernandez@email.com',
    phone: '+54 11 2222-3333',
    birthDate: '1980-12-10',
    conditions: ['Drenaje linfático'],
  },
  {
    id: '5',
    name: 'Lucía Beatriz Morales',
    email: 'lucia.morales@email.com',
    phone: '+54 11 4444-5555',
    birthDate: '1988-05-22',
    conditions: ['Cervical'],
  },
  {
    id: '6',
    name: 'Roberto Daniel Castro',
    email: 'roberto.castro@email.com',
    phone: '+54 11 6666-7777',
    birthDate: '1975-09-18',
    conditions: ['Lumbar', 'Cadera'],
  },
  {
    id: '7',
    name: 'Valeria Susana López',
    email: 'valeria.lopez@email.com',
    phone: '+54 11 8888-9999',
    birthDate: '1995-01-30',
    conditions: ['Hombro'],
  },
  {
    id: '8',
    name: 'Miguel Alejandro Ruiz',
    email: 'miguel.ruiz@email.com',
    phone: '+54 11 1111-4444',
    birthDate: '1982-07-14',
    conditions: ['Rodilla'],
  },
  {
    id: '9',
    name: 'Carmen Elena Herrera',
    email: 'carmen.herrera@email.com',
    phone: '+54 11 3333-6666',
    birthDate: '1990-11-25',
    conditions: ['Tobillo/Pie'],
  },
  {
    id: '10',
    name: 'Fernando José Vargas',
    email: 'fernando.vargas@email.com',
    phone: '+54 11 5555-8888',
    birthDate: '1983-04-08',
    conditions: ['Muñeca/Mano'],
  }
];

const getDemoPractitioners = (): Practitioner[] => [
  {
    id: '1',
    name: 'Dr. Juan Pérez',
    specialty: 'Traumatología',
    email: 'juan.perez@clinic.com',
    phone: '+54 11 1111-2222',
    color: '#3b82f6', // Blue
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
    color: '#10b981', // Green
    schedule: [
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isAvailable: true },
    ],
  },
  {
    id: '3',
    name: 'Lic. Roberto Martín',
    specialty: 'Fisioterapia',
    email: 'roberto.martin@clinic.com',
    phone: '+54 11 5555-6666',
    color: '#8b5cf6', // Purple
    schedule: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isAvailable: true },
      { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', isAvailable: true },
      { dayOfWeek: 3, startTime: '10:00', endTime: '18:00', isAvailable: true },
      { dayOfWeek: 4, startTime: '10:00', endTime: '18:00', isAvailable: true },
      { dayOfWeek: 5, startTime: '10:00', endTime: '18:00', isAvailable: true },
    ],
  },
];

const getDemoAvailability = (): Availability[] => [
  // Dr. Juan Pérez (Lunes, Miércoles, Viernes 8-16)
  { id: '1', practitionerId: '1', weekday: 1, from: '08:00', to: '16:00', slotMinutes: 30, capacity: 5 },
  { id: '2', practitionerId: '1', weekday: 3, from: '08:00', to: '16:00', slotMinutes: 30, capacity: 5 },
  { id: '3', practitionerId: '1', weekday: 5, from: '08:00', to: '16:00', slotMinutes: 30, capacity: 5 },
  
  // Lic. Carmen López (Martes, Jueves 9-17, Sábado 9-13)
  { id: '4', practitionerId: '2', weekday: 2, from: '09:00', to: '17:00', slotMinutes: 30, capacity: 5 },
  { id: '5', practitionerId: '2', weekday: 4, from: '09:00', to: '17:00', slotMinutes: 30, capacity: 5 },
  { id: '6', practitionerId: '2', weekday: 6, from: '09:00', to: '13:00', slotMinutes: 30, capacity: 5 },
  
  // Lic. Roberto Martín (Lun-Vie 10-18)
  { id: '7', practitionerId: '3', weekday: 1, from: '10:00', to: '18:00', slotMinutes: 30, capacity: 5 },
  { id: '8', practitionerId: '3', weekday: 2, from: '10:00', to: '18:00', slotMinutes: 30, capacity: 5 },
  { id: '9', practitionerId: '3', weekday: 3, from: '10:00', to: '18:00', slotMinutes: 30, capacity: 5 },
  { id: '10', practitionerId: '3', weekday: 4, from: '10:00', to: '18:00', slotMinutes: 30, capacity: 5 },
  { id: '11', practitionerId: '3', weekday: 5, from: '10:00', to: '18:00', slotMinutes: 30, capacity: 5 },
];

const getDemoExceptions = (): Exception[] => [
  // Feriados nacionales 2025 Argentina
  { id: '1', date: '2025-01-01', closed: true }, // Año Nuevo
  { id: '2', date: '2025-03-03', closed: true }, // Carnaval (lunes)
  { id: '3', date: '2025-03-04', closed: true }, // Carnaval (martes)
  { id: '4', date: '2025-03-24', closed: true }, // Día de la Memoria
  { id: '5', date: '2025-04-02', closed: true }, // Malvinas (Veteranos)
  { id: '6', date: '2025-04-17', closed: true }, // Jueves Santo
  { id: '7', date: '2025-04-18', closed: true }, // Viernes Santo
  { id: '8', date: '2025-05-01', closed: true }, // Día del Trabajador
  { id: '9', date: '2025-05-02', closed: true }, // Puente turístico
  { id: '10', date: '2025-05-25', closed: true }, // Revolución de Mayo
  { id: '11', date: '2025-06-16', closed: true }, // Feriado por Güemes
  { id: '12', date: '2025-06-20', closed: true }, // Día de la Bandera
  { id: '13', date: '2025-07-09', closed: true }, // Independencia
  { id: '14', date: '2025-08-15', closed: true }, // Puente (San Martín)
  { id: '15', date: '2025-08-17', closed: true }, // San Martín
  { id: '16', date: '2025-10-12', closed: true }, // Diversidad Cultural
  { id: '17', date: '2025-11-21', closed: true }, // Puente (Soberanía)
  { id: '18', date: '2025-11-24', closed: true }, // Soberanía Nacional
  { id: '19', date: '2025-12-08', closed: true }, // Inmaculada Concepción
  { id: '20', date: '2025-12-25', closed: true }, // Navidad
];

const getDemoAppointments = (): Appointment[] => {
  const now = new Date();
  const currentWeek = now;
  const prevWeek = subWeeks(currentWeek, 1);
  const nextWeek = addWeeks(currentWeek, 1);
  const nextWeek2 = addWeeks(currentWeek, 2);

  return [
    // Semana pasada (estados mixtos)
    {
      id: '1',
      patientId: '1',
      practitionerId: '1',
      date: format(prevWeek, 'yyyy-MM-dd'),
      startTime: '10:00',
      endTime: '11:00',
      type: 'consultation',
      status: 'completed',
      notes: 'Seguimiento de lesión de rodilla',
      slotIndex: 0,
    },
    {
      id: '2',
      patientId: '2',
      practitionerId: '2',
      date: format(prevWeek, 'yyyy-MM-dd'),
      startTime: '14:00',
      endTime: '15:00',
      type: 'therapy',
      status: 'no_show',
      notes: 'No se presentó',
      slotIndex: 1,
    },
    
    // Semana actual
    {
      id: '3',
      patientId: '3',
      practitionerId: '3',
      date: format(currentWeek, 'yyyy-MM-dd'),
      startTime: '11:00',
      endTime: '12:00',
      type: 'therapy',
      status: 'scheduled',
      notes: 'Fisioterapia respiratoria',
      slotIndex: 0,
    },
    {
      id: '4',
      patientId: '4',
      practitionerId: '1',
      date: format(currentWeek, 'yyyy-MM-dd'),
      startTime: '15:00',
      endTime: '16:00',
      type: 'consultation',
      status: 'scheduled',
      notes: 'Evaluación inicial',
      slotIndex: 2,
    },
    
    // Próximas semanas
    {
      id: '5',
      patientId: '5',
      practitionerId: '2',
      date: format(nextWeek, 'yyyy-MM-dd'),
      startTime: '10:00',
      endTime: '11:00',
      type: 'therapy',
      status: 'scheduled',
      notes: 'Sesión de kinesiología',
      slotIndex: 0,
    },
    {
      id: '6',
      patientId: '6',
      practitionerId: '3',
      date: format(nextWeek2, 'yyyy-MM-dd'),
      startTime: '16:00',
      endTime: '17:00',
      type: 'follow-up',
      status: 'scheduled',
      notes: 'Control post-tratamiento',
      slotIndex: 1,
    },
  ];
};

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