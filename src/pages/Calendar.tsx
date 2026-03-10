import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatPatientShortName, matchesPatientSearch } from '@/utils/formatters';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  User,
  Clock,
  X,
  Plus,
  Check,
  Search,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useApp, Appointment } from '@/contexts/AppContext';
import type { TreatmentType } from '@/types/appointments';
import { treatmentLabel } from '@/utils/formatters';
import { DynamicTreatmentSelect } from '@/components/shared/DynamicTreatmentSelect';
import { getAccessibleTextColor } from '@/utils/colorUtils';
import { statusLabel, type AppointmentStatus } from '@/utils/statusUtils';
import { displaySelectedLabel, parseSlotKey, isPastDay } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { NewAppointmentDialog } from '@/components/dialogs/NewAppointmentDialog';
import { AppointmentDetailDialog } from '@/components/dialogs/AppointmentDetailDialog';
import { MassCreateAppointmentDialog } from '@/components/dialogs/MassCreateAppointmentDialog';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { KinesioCombobox } from '@/components/shared/KinesioCombobox';
import { TreatmentMultiSelect } from '@/components/shared/TreatmentMultiSelect';
import { WeekNavigatorCompact } from '@/components/navigation/WeekNavigatorCompact';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { useAutoNoAsistio } from '@/hooks/useAutoNoAsistio';
import { useAppointmentsForClinic } from '@/hooks/useAppointmentsForClinic';
import { useScheduleExceptions } from '@/hooks/useScheduleExceptions';
import { usePractitioners } from '@/hooks/usePractitioners';
import { usePatients } from '@/hooks/usePatients';
import { updateAppointmentStatus } from '@/lib/appointmentService';
import { useClinicSettings, generateTimeSlots, formatTimeShort } from '@/hooks/useClinicSettings';
import { useTreatments } from '@/hooks/useTreatments';
import { useFirstVisitPatients } from '@/hooks/useFirstVisitPatients';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const MOBILE_WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const TYPE_LABELS_CAL: Record<string, string> = {
  clinic_closed: 'Día cerrado',
  practitioner_block: 'Bloqueo profesional',
  extended_hours: 'Horario extendido',
};

// Utilidades para tri-estado
type Status = 'scheduled' | 'completed' | 'no_show';
const statusToChecked = (s: Status) => s === 'completed' ? true : s === 'no_show' ? 'indeterminate' : false;
const nextStatus = (s: Status): Status => s === 'scheduled' ? 'completed' : s === 'completed' ? 'no_show' : 'scheduled';

// Crear clave única para cada sub-slot
const getSlotKey = ({ dateISO, hour, subSlot }: { dateISO: string; hour: string; subSlot: number }) => {
  return `${dateISO}_${hour}_${subSlot}`;
};

export const Calendar = () => {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  
  // Initialize auto no asistio hook
  useAutoNoAsistio();
  
  // Cargar configuración dinámica de la clínica
  const { settings: clinicSettings, isLoading: loadingSettings } = useClinicSettings();
  
  // Cargar profesionales de la clínica desde BD y sincronizar con AppContext
  const { practitioners: dbPractitioners, loading: loadingPractitioners } = usePractitioners(state.currentClinicId);
  
  // Cargar pacientes de la clínica desde BD
  const { patients: dbPatients, loading: loadingPatients } = usePatients(state.currentClinicId);

  // Cargar tratamientos para detectar exclusividad
  const { treatments } = useTreatments();
  const exclusiveTreatmentIds = useMemo(() => {
    const set = new Set<string>();
    treatments.filter(t => t.max_concurrent === 1).forEach(t => set.add(t.id));
    return set;
  }, [treatments]);
  const isExclusiveTreatment = useCallback((apt: { treatmentTypeId?: string }) => 
    apt.treatmentTypeId ? exclusiveTreatmentIds.has(apt.treatmentTypeId) : false
  , [exclusiveTreatmentIds]);

  // Comparación profunda para evitar dispatches redundantes
  const hasPractitionerDataChanged = (prev: typeof dbPractitioners, next: typeof dbPractitioners): boolean => {
    if (prev.length !== next.length) return true;
    for (let i = 0; i < prev.length; i++) {
      if (prev[i].id !== next[i].id || prev[i].name !== next[i].name || prev[i].color !== next[i].color) return true;
    }
    return false;
  };

  const hasPatientDataChanged = (prev: typeof dbPatients, next: typeof dbPatients): boolean => {
    if (prev.length !== next.length) return true;
    for (let i = 0; i < prev.length; i++) {
      if (prev[i].id !== next[i].id || prev[i].name !== next[i].name) return true;
    }
    return false;
  };

  // Sincronizar profesionales de BD con AppContext (protegido con comparación profunda)
  const prevPractitionersRef = useRef(dbPractitioners);
  useEffect(() => {
    if (dbPractitioners.length > 0 && hasPractitionerDataChanged(prevPractitionersRef.current, dbPractitioners)) {
      prevPractitionersRef.current = dbPractitioners;
      dispatch({ type: 'SET_PRACTITIONERS', payload: dbPractitioners });
    }
  }, [dbPractitioners, dispatch]);
  
  // Sincronizar pacientes de BD con AppContext (protegido con comparación profunda)
  const prevPatientsRef = useRef(dbPatients);
  useEffect(() => {
    if (dbPatients.length > 0 && hasPatientDataChanged(prevPatientsRef.current, dbPatients)) {
      prevPatientsRef.current = dbPatients;
      dispatch({ type: 'SET_PATIENTS', payload: dbPatients });
    }
  }, [dbPatients, dispatch]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0); // Para mobile
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string; date: Date; subSlot?: number } | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showMassCreateModal, setShowMassCreateModal] = useState(false);
  const [agendaBanner, setAgendaBanner] = useState<{ type: 'error'; text: string } | null>(null);
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | null>(null);

  // Scroll preservation refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollHour = useRef<string | null>(null);

  // Mobile scroll preservation refs
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const savedMobileScrollHour = useRef<string | null>(null);

  // Mobile swipe refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Leer patientId desde query params para filtrar calendario por paciente
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const patientId = searchParams.get('patientId');
    if (patientId) {
      // Buscar nombre del paciente para setear el filtro visual
      const patient = state.patients.find(p => p.id === patientId);
      if (patient) {
        dispatch({ type: 'SET_FILTER_PATIENT_SEARCH', payload: patient.name });
      }
      setPreselectedPatientId(patientId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, state.patients, dispatch]);

  // Obtener fechas de la semana laboral (memoizado para evitar re-renders)
  const weekDates = useMemo(() => {
    const currentWeek = state.calendarWeekStart 
      ? new Date(state.calendarWeekStart + 'T00:00:00') 
      : new Date();
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Lunes
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  }, [state.calendarWeekStart]);
  
  // Generar slots dinámicamente según clinic_settings
  const TIME_SLOTS = clinicSettings 
    ? generateTimeSlots(
        clinicSettings.workday_start,
        clinicSettings.workday_end,
        clinicSettings.min_slot_minutes
      )
    : [];

  // Capture mobile scroll hour and change day
  const changeMobileDay = useCallback((newDay: number) => {
    const container = mobileScrollRef.current;
    if (container && TIME_SLOTS.length > 0) {
      const rows = container.querySelectorAll<HTMLElement>('[data-time-row-mobile]');
      const containerTop = container.scrollTop;
      let closestHour: string | null = null;
      for (const row of rows) {
        if (row.offsetTop - container.offsetTop <= containerTop + 10) {
          closestHour = row.getAttribute('data-time-row-mobile');
        } else {
          break;
        }
      }
      savedMobileScrollHour.current = closestHour || TIME_SLOTS[0];
    }
    setSelectedDay(newDay);
  }, [TIME_SLOTS]);

  // Swipe handlers for mobile calendar
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && selectedDay < 4) {
        changeMobileDay(selectedDay + 1);
      } else if (deltaX > 0 && selectedDay > 0) {
        changeMobileDay(selectedDay - 1);
      }
    }
  }, [selectedDay, changeMobileDay]);
  
  // Fetch appointments from Supabase
  const { appointments: dbAppointments, isLoading: loadingAppointments, refetch } = useAppointmentsForClinic(
    weekDates[0], 
    weekDates[4]
  );

  // Fetch schedule exceptions and holidays for the visible week
  const { exceptionsMap, isBlocked: isSlotBlocked } = useScheduleExceptions(weekDates[0], weekDates[4]);
  
  // Effect to refetch when appointments are updated
  useEffect(() => {
    const handleRefetch = () => refetch();
    window.addEventListener('appointmentUpdated', handleRefetch);
    return () => window.removeEventListener('appointmentUpdated', handleRefetch);
  }, [refetch]);
  
  // Sincronizar citas de BD con AppContext (protegido contra dispatches redundantes)
  const prevAppointmentsRef = useRef(dbAppointments);
  useEffect(() => {
    if (dbAppointments !== prevAppointmentsRef.current) {
      prevAppointmentsRef.current = dbAppointments;
      dispatch({ type: 'SET_APPOINTMENTS', payload: dbAppointments });
    }
  }, [dbAppointments, dispatch]);

  // Detectar pacientes de primera visita
  const weekPatientIds = useMemo(() => {
    const ids = new Set<string>();
    dbAppointments.forEach(a => { if (a.patientId) ids.add(a.patientId); });
    return Array.from(ids);
  }, [dbAppointments]);
  const firstVisitPatients = useFirstVisitPatients(
    state.currentClinicId,
    weekPatientIds,
    format(weekDates[0], 'yyyy-MM-dd'),
    format(weekDates[4], 'yyyy-MM-dd')
  );

  // Índice de TODAS las citas memoizado (para verificar ocupación por otros profesionales)
  const allAppointmentsBySlotKey = useMemo(() => {
    const map = new Map<string, Appointment>();
    dbAppointments.forEach(appointment => {
      const dateISO = appointment.date.length === 10
        ? appointment.date
        : format(parseISO(appointment.date), 'yyyy-MM-dd');
      const subSlot0 = ((appointment.subSlot ?? 1) - 1);
      const hourNormalized = appointment.startTime.substring(0, 5);
      const key = getSlotKey({ dateISO, hour: hourNormalized, subSlot: subSlot0 });
      map.set(key, appointment);
    });
    return map;
  }, [dbAppointments]);

  // Filtrar citas por profesional Y/O paciente (memoizado)
  const filteredAppointments = useMemo(() => {
    return dbAppointments.filter(apt => {
      if (state.filterPractitionerId && apt.practitionerId !== state.filterPractitionerId) {
        return false;
      }
      if (state.filterPatientSearch) {
        const patient = state.patients.find(p => p.id === apt.patientId);
        const searchLower = state.filterPatientSearch.toLowerCase();
        const patientNameMatch = patient ? matchesPatientSearch(patient, searchLower) : false;
        if (!patientNameMatch) {
          return false;
        }
      }
      return true;
    });
  }, [dbAppointments, state.filterPractitionerId, state.filterPatientSearch, state.patients]);

  // Índice de citas filtradas por clave de sub-slot (memoizado)
  const appointmentsBySlotKey = useMemo(() => {
    const map = new Map<string, Appointment>();
    filteredAppointments.forEach(appointment => {
      const dateISO = appointment.date.length === 10
        ? appointment.date
        : format(parseISO(appointment.date), 'yyyy-MM-dd');
      const subSlot0 = ((appointment.subSlot ?? 1) - 1);
      const hourNormalized = appointment.startTime.substring(0, 5);
      const key = getSlotKey({ dateISO, hour: hourNormalized, subSlot: subSlot0 });
      map.set(key, appointment);
    });
    return map;
  }, [filteredAppointments]);

  // Verificar si un slot está ocupado por otro profesional (cuando hay filtro activo)
  const isOccupiedByOtherPractitioner = (key: string): boolean => {
    if (!state.filterPractitionerId) return false;
    const apt = allAppointmentsBySlotKey.get(key);
    return apt !== undefined && apt.practitionerId !== state.filterPractitionerId;
  };

  // Verificar si un slot está ocupado por otro paciente (cuando hay filtro de paciente activo)
  const isOccupiedByOtherPatient = (key: string): boolean => {
    if (!state.filterPatientSearch) return false;
    const apt = allAppointmentsBySlotKey.get(key);
    if (!apt || !apt.patientId) return false;
    const patient = state.patients.find(p => p.id === apt.patientId);
    if (!patient) return false;
    const searchLower = state.filterPatientSearch.toLowerCase();
    return !matchesPatientSearch(patient, searchLower);
  };

  // Verificar si un bloque horario está bloqueado por un tratamiento exclusivo
  // IMPORTANTE: solo bloquea si el profesional indicado tiene la cita exclusiva
  // Si no hay practitionerId, no bloquea visualmente (el servidor valida)
  const isBlockedByExclusive = useCallback((dayIndex: number, time: string, practitionerId?: string): boolean => {
    if (exclusiveTreatmentIds.size === 0) return false;
    if (!practitionerId) return false; // Sin filtro de profesional, no bloquear visualmente
    const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
    for (let s = 0; s < 5; s++) {
      const key = getSlotKey({ dateISO, hour: time, subSlot: s });
      const apt = allAppointmentsBySlotKey.get(key);
      if (
        apt &&
        apt.practitionerId === practitionerId &&
        apt.treatmentTypeId &&
        exclusiveTreatmentIds.has(apt.treatmentTypeId) &&
        apt.status !== 'cancelled'
      ) {
        return true;
      }
    }
    return false;
  }, [exclusiveTreatmentIds, weekDates, allAppointmentsBySlotKey]);

  // Effect to update loading when week changes and clean past selections
  // Capture scroll position before view changes
  const captureScrollHour = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || TIME_SLOTS.length === 0) return;
    const timeRows = container.querySelectorAll<HTMLElement>('[data-time-row]');
    const containerTop = container.scrollTop + container.offsetTop;
    let closestHour: string | null = null;
    for (const row of timeRows) {
      if (row.offsetTop <= containerTop + 10) {
        closestHour = row.getAttribute('data-time-row');
      } else {
        break;
      }
    }
    savedScrollHour.current = closestHour || TIME_SLOTS[0];
  }, [TIME_SLOTS]);

  // Listen for scrollToHour events (e.g. after reschedule)
  useEffect(() => {
    const handler = (e: Event) => {
      const hour = (e as CustomEvent<string>).detail;
      if (hour) {
        savedScrollHour.current = hour;
        savedMobileScrollHour.current = hour;
      }
    };
    window.addEventListener('scrollToHour', handler);
    return () => window.removeEventListener('scrollToHour', handler);
  }, []);

  // Save scroll before week/filter changes
  useEffect(() => {
    captureScrollHour();
  }, [state.calendarWeekStart, state.filterPractitionerId, state.filterPatientSearch]);

  // Restore scroll after data loads
  useEffect(() => {
    if (loadingAppointments || loadingSettings || !savedScrollHour.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetRow = container.querySelector<HTMLElement>(`[data-time-row="${savedScrollHour.current}"]`);
    if (targetRow) {
      container.scrollTo({ top: targetRow.offsetTop - container.offsetTop, behavior: 'instant' as ScrollBehavior });
    } else {
      // If saved hour exceeds available slots, scroll to last row
      const allRows = container.querySelectorAll<HTMLElement>('[data-time-row]');
      if (allRows.length > 0) {
        const lastRow = allRows[allRows.length - 1];
        container.scrollTo({ top: lastRow.offsetTop - container.offsetTop, behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [loadingAppointments, loadingSettings, state.calendarWeekStart, state.filterPractitionerId]);

  // Restore mobile scroll position after day change
  useEffect(() => {
    if (!savedMobileScrollHour.current) return;
    const container = mobileScrollRef.current;
    if (!container) return;
    // Small delay to let TabsContent render
    requestAnimationFrame(() => {
      const target = container.querySelector<HTMLElement>(`[data-time-row-mobile="${savedMobileScrollHour.current}"]`);
      if (target) {
        container.scrollTo({ top: target.offsetTop - container.offsetTop, behavior: 'instant' as ScrollBehavior });
      }
    });
  }, [selectedDay]);


  useEffect(() => {
    if (state.calendarWeekStart) {
      // Clean past day selections only for non-admin users
      if (state.userRole !== 'admin_clinic' && state.userRole !== 'tenant_owner') {
        const filteredSlots = [...state.selectedSlots].filter(key => {
          const [dateISO] = key.split('_');
          return !isPastDay(dateISO);
        });
        
        if (filteredSlots.length !== state.selectedSlots.size) {
          dispatch({ type: 'CLEAR_SLOT_SELECTION' });
        }
      }
      
      // Clear banner
      setAgendaBanner(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.calendarWeekStart]);


  // Obtener citas para un slot específico (opcionalmente filtrado por subIndex)
  const getAppointmentsForSlot = (dayIndex: number, time: string, subIndex?: number) => {
    const targetDateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
    return dbAppointments.filter(apt => {
      const aptISO = apt.date.length === 10
        ? apt.date
        : format(parseISO(apt.date), 'yyyy-MM-dd');
      const matchesSlot = aptISO === targetDateISO && apt.startTime === time;
      if (subIndex !== undefined) {
        // Comparar subSlot (1-5) con subIndex + 1
        return matchesSlot && apt.subSlot === (subIndex + 1);
      }
      return matchesSlot;
    });
  };

  // Obtener capacidad para un slot
  const getSlotCapacity = (dayIndex: number, time: string) => {
    const weekday = (dayIndex + 1) % 7; // Convert to 0=Sunday format
    const availability = state.availability.find(av => 
      av.weekday === weekday && 
      time >= av.from && 
      time < av.to
    );
    return availability?.capacity || 5; // Default capacity
  };

  // Obtener próximo sub-slot disponible
  const getNextAvailableSubSlot = (dayIndex: number, time: string) => {
    const appointments = getAppointmentsForSlot(dayIndex, time);
    const capacity = getSlotCapacity(dayIndex, time);
    const usedSlots = appointments.map(apt => apt.subSlot);
    
    for (let i = 1; i <= capacity; i++) {
      if (!usedSlots.includes(i as 1 | 2 | 3 | 4 | 5)) {
        return i as 1 | 2 | 3 | 4 | 5;
      }
    }
    return null; // No available slots
  };

  // Verificar si hay slot disponible
  const isSlotAvailable = (dayIndex: number, time: string) => {
    const appointments = getAppointmentsForSlot(dayIndex, time);
    const capacity = getSlotCapacity(dayIndex, time);
    
    // Si hay menos citas que capacidad, hay slots disponibles
    return appointments.length < capacity;
  };

  // Obtener color del kinesiólogo
  const getPractitionerColor = (practitionerId: string) => {
    const practitioner = state.practitioners.find(p => p.id === practitionerId);
    return practitioner?.color || '#6b7280'; // Default gray
  };

  // Obtener estilos con contraste accesible
  const getPractitionerStyles = (practitionerId: string) => {
    const bgColor = getPractitionerColor(practitionerId);
    const textColor = getAccessibleTextColor(bgColor);
    return {
      backgroundColor: bgColor,
      color: textColor,
      borderColor: bgColor,
    };
  };

  // Verificar si multi-selección está habilitada
  const isMultiSelectEnabled = state.userRole === 'admin_clinic' || state.userRole === 'tenant_owner' || state.userRole === 'receptionist';

  // Función para alternar selección de slot
  const toggleSelect = (key: string) => {
    dispatch({ type: 'TOGGLE_SLOT_SELECTION', payload: key });
  };

  // Handler para toggle tri-estado - CONECTADO A BD
  const onTriToggle = async (apt: Appointment) => {
    const dateISO = apt.date.length === 10 ? apt.date : format(parseISO(apt.date), 'yyyy-MM-dd');
    if (isPastDay(dateISO) && state.userRole !== 'admin_clinic' && state.userRole !== 'tenant_owner') {
      toast({
        title: "Acceso denegado",
        description: "No puedes realizar cambios en días anteriores",
        variant: "destructive",
      });
      return;
    }
    
    const nextStatusValue = nextStatus(apt.status as Status);
    
    try {
      // Actualizar en BD
      await updateAppointmentStatus(apt.id, nextStatusValue);
      
      // Actualizar índice local
      const subSlot0 = ((apt.subSlot ?? 1) - 1);
      const key = getSlotKey({ dateISO, hour: apt.startTime, subSlot: subSlot0 });
      const updatedApt = { ...apt, status: nextStatusValue };
      appointmentsBySlotKey.set(key, updatedApt);
      
      // Refrescar lista
      refetch();
      
      const msg = nextStatusValue === 'completed' ? 'Turno marcado como Asistió' : 
                  nextStatusValue === 'scheduled' ? 'Turno marcado como Reservado' : 
                  'Turno marcado como No Asistió';
      toast({
        title: msg,
        description: "El estado del turno se ha actualizado",
      });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del turno",
        variant: "destructive",
      });
    }
  };

  // Handler de clic en sub-slot
  const onSubSlotClick = (meta: { dayIndex: number; time: string; subSlot: number }) => {
    const dateISO = format(weekDates[meta.dayIndex], 'yyyy-MM-dd');
    const key = getSlotKey({ dateISO, hour: meta.time, subSlot: meta.subSlot });
    const appointment = appointmentsBySlotKey.get(key);
    const isPast = isPastDay(dateISO);

    // Check schedule exceptions (closed days, holidays, practitioner blocks)
    const blockCheck = isSlotBlocked(dateISO, meta.time, state.filterPractitionerId || undefined);
    if (blockCheck.blocked && !appointment) {
      toast({
        title: "Horario bloqueado",
        description: blockCheck.reason || 'Este horario no está disponible',
        variant: "destructive",
      });
      return;
    }

    
    // Verificar si está ocupado por otro profesional
    if (isOccupiedByOtherPractitioner(key)) {
      toast({
        title: "Slot no disponible",
        variant: "destructive",
      });
      return;
    }

    // Verificar si está ocupado por otro paciente
    if (isOccupiedByOtherPatient(key)) {
      toast({
        title: "Slot ocupado por otro paciente",
        variant: "destructive",
      });
      return;
    }
    
    if (appointment) {
      // Abrir detalle de turno existente (siempre permitido)
      setAgendaBanner(null);
      setSelectedAppointmentId(appointment.id);
    } else {
      // Sub-slot vacío: verificar bloqueo por exclusividad
      if (isBlockedByExclusive(meta.dayIndex, meta.time, state.filterPractitionerId || undefined)) {
        toast({
          title: "Horario bloqueado",
          description: "Un tratamiento exclusivo ya ocupa este bloque horario",
          variant: "destructive",
        });
        return;
      }

      // Sub-slot vacío (crear)
      if (isPast && (state.userRole === 'receptionist' || state.userRole === 'health_pro')) {
        setAgendaBanner({ type: 'error', text: 'No se pueden elegir citas de días anteriores' });
        return; // No seleccionar ni abrir modales de creación
      }
      
      setAgendaBanner(null); // Admin o día actual/futuro
      
      if (isMultiSelectEnabled) {
        toggleSelect(key);
      } else {
        // Abrir nuevo turno (para rol kinesio)
        setSelectedSlot({ 
          day: meta.dayIndex, 
          time: meta.time, 
          date: weekDates[meta.dayIndex],
          subSlot: meta.subSlot
        });
        setShowNewAppointmentModal(true);
      }
    }
  };

  // Función para confirmar selección múltiple
  const confirmSelection = () => {
    if (state.selectedSlots.size === 0 || !state.selectedPractitionerId || !state.selectedTreatmentType) {
      const missing = [];
      if (state.selectedSlots.size === 0) missing.push('horarios');
      if (!state.selectedPractitionerId) missing.push('kinesiólogo');
      if (!state.selectedTreatmentType) missing.push('tipo de tratamiento');
      
      toast({
        title: "Datos incompletos",
        description: `Falta seleccionar: ${missing.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Verificar bloqueos del profesional seleccionado en los slots elegidos
    if (state.selectedPractitionerId) {
      const blockedSlots: string[] = [];
      for (const slotKey of state.selectedSlots) {
        const { dateISO, hour } = parseSlotKey(slotKey);

        if (!dateISO || !hour) {
          continue;
        }

        const blockCheck = isSlotBlocked(dateISO, hour, state.selectedPractitionerId);
        if (blockCheck.blocked) {
          const dayName = format(parseISO(dateISO), 'EEE dd/MM', { locale: es });
          blockedSlots.push(`${dayName} ${hour} — ${blockCheck.reason || 'No disponible'}`);
        }
      }
      if (blockedSlots.length > 0) {
        toast({
          title: "Profesional no disponible",
          description: `El profesional tiene bloqueos en: ${blockedSlots.join('; ')}`,
          variant: "destructive",
        });
        return;
      }
    }

    setShowMassCreateModal(true);
  };

  // Listen for mass create modal trigger from topbar
  useEffect(() => {
    const handleOpenMassCreate = () => {
      confirmSelection();
    };
    
    window.addEventListener('openMassCreateModal', handleOpenMassCreate);
    return () => window.removeEventListener('openMassCreateModal', handleOpenMassCreate);
  }, [state.selectedSlots.size, state.selectedPractitionerId]);

  // Función para limpiar selección
  const clearSelection = () => {
    dispatch({ type: 'CLEAR_SLOT_SELECTION' });
  };

  // Handlers de interacción (mantener para compatibilidad)
  const handleSlotClick = (dayIndex: number, time: string, subIndex?: number) => {
    if (subIndex !== undefined) {
      onSubSlotClick({ dayIndex, time, subSlot: subIndex + 1 });
    } else {
      // Fallback para clicks sin subIndex específico
      onSubSlotClick({ dayIndex, time, subSlot: 1 });
    }
  };

  // Handler para exportar datos
  const handleExport = () => {
    // Implementar lógica de exportación
    toast({
      title: "Exportar datos",
      description: "Funcionalidad de exportación en desarrollo",
    });
  };

  // Renderizado de slot para grid con capacidad múltiple
  const renderSlot = (dayIndex: number, time: string) => {
    const capacity = getSlotCapacity(dayIndex, time);
    const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
    
    // Obtener citas usando el índice de sub-slots
    const slotAppointments = Array.from({ length: 5 }, (_, subIndex) => {
      const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });
      return appointmentsBySlotKey.get(key);
    });
    
    const hasAppointments = slotAppointments.some(apt => apt !== undefined);

    // Si hay citas, mostrar sub-slots
    // Alturas uniformes: 60px para todos los sub-slots
    const rowHeights = 'repeat(5, 60px)';

    // Helper para obtener el badge de estado
    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'completed':
          return { label: 'Asistió', className: 'bg-green-100 text-green-800' };
        case 'no_show':
          return { label: 'No Asistió', className: 'bg-red-100 text-red-800' };
        case 'cancelled':
          return { label: 'Cancelado', className: 'bg-gray-100 text-gray-800' };
        case 'confirmed':
          return { label: 'Confirmado', className: 'bg-blue-100 text-blue-800' };
        case 'scheduled':
        default:
          return { label: 'Reservado', className: 'bg-blue-500 text-white' };
      }
    };

    if (hasAppointments) {
      return (
        <div key={`${dayIndex}-${time}`} className="p-1 border border-gray-400 grid gap-1"
             style={{ gridTemplateRows: rowHeights }}>
          {Array.from({ length: 5 }).map((_, subIndex) => {
              const appointment = slotAppointments[subIndex];
            
            if (appointment) {
              const patient = state.patients.find(p => p.id === appointment.patientId);
              const practitioner = state.practitioners.find(p => p.id === appointment.practitionerId);
              const styles = getPractitionerStyles(appointment.practitionerId);
              const hasPermission = ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'].includes(state.userRole);
              const stateAttr = statusToChecked(appointment.status as Status);
              const aria = stateAttr === true ? 'true' : stateAttr === 'indeterminate' ? 'mixed' : 'false';
              const statusBadge = getStatusBadge(appointment.status);
              
              return (
                <div key={`${dayIndex}-${time}-${subIndex}`} className="flex items-stretch h-full w-full">
                  <div 
                    className="text-xs p-1 rounded border hover:opacity-80 transition-all text-left focus:outline-none focus:ring-1 focus:ring-ring flex gap-1.5 w-full h-full overflow-hidden relative z-[2]"
                    style={styles}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex + 1 })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSubSlotClick({ dayIndex, time, subSlot: subIndex + 1 });
                      }
                    }}
                    aria-label={`Turno de ${patient?.name || 'Paciente'} con ${practitioner?.name || 'Profesional'} a las ${time}, sub-slot ${subIndex + 1}`}
                  >
                    {hasPermission && appointment.practitionerId && appointment.patientId && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={aria}
                        onClick={(e) => { e.stopPropagation(); onTriToggle(appointment); }}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer bg-background shrink-0 mt-0.5"
                        data-state={stateAttr === true ? 'checked' : stateAttr === 'indeterminate' ? 'indeterminate' : 'unchecked'}
                      >
                        {stateAttr === true && <Check className="h-3 w-3 text-green-600" />}
                        {stateAttr === 'indeterminate' && <X className="h-3 w-3 text-red-600" />}
                      </button>
                    )}
                    {isExclusiveTreatment(appointment) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 absolute top-1.5 right-2" />
                        </TooltipTrigger>
                        <TooltipContent><p>Tratamiento exclusivo</p></TooltipContent>
                      </Tooltip>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 overflow-hidden">
                      <span className="font-medium text-xs truncate">
                        {patient ? formatPatientShortName(patient) : 'Paciente'}
                        {appointment.patientId && firstVisitPatients.get(appointment.patientId) === appointment.date && (
                          <span className="ml-1 inline-flex items-center justify-center bg-blue-600 text-white text-[9px] font-bold rounded px-1 leading-tight align-middle" title="Primera visita">N</span>
                        )}
                      </span>
                      <span className="text-[10px] opacity-75 truncate">{practitioner?.name || 'Profesional'}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full w-fit ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            } else if (subIndex < capacity) {
              const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
              const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });

              // Verificar si está bloqueado por tratamiento exclusivo
              if (isBlockedByExclusive(dayIndex, time, state.filterPractitionerId || undefined)) {
                return (
                  <Tooltip key={`${dayIndex}-${time}-${subIndex}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="text-xs p-1 rounded bg-muted border border-destructive/30 flex items-center justify-center cursor-not-allowed min-h-[56px]"
                        aria-label="Bloqueado: tratamiento exclusivo en este horario"
                      >
                        <Lock className="h-3 w-3 text-destructive/60" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Bloqueado: tratamiento exclusivo en este horario</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
              // Verificar si está ocupado por otro profesional
              if (isOccupiedByOtherPractitioner(key)) {
                const occupyingApt = allAppointmentsBySlotKey.get(key);
                const occupyingPractitioner = occupyingApt 
                  ? state.practitioners.find(p => p.id === occupyingApt.practitionerId)
                  : null;
                
                return (
                  <Tooltip key={`${dayIndex}-${time}-${subIndex}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="text-xs p-1 rounded bg-muted border border-border flex items-center justify-center cursor-not-allowed"
                        aria-label={`Ocupado por ${occupyingPractitioner?.name || 'otro profesional'}`}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ocupado por {occupyingPractitioner?.name || 'otro profesional'}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              // Verificar si está ocupado por otro paciente
              if (isOccupiedByOtherPatient(key)) {
                const occupyingApt = allAppointmentsBySlotKey.get(key);
                const occupyingPatient = occupyingApt
                  ? state.patients.find(p => p.id === occupyingApt.patientId)
                  : null;
                
                return (
                  <Tooltip key={`${dayIndex}-${time}-${subIndex}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="text-xs p-1 rounded bg-muted border border-border flex items-center justify-center cursor-not-allowed"
                        aria-label={`Ocupado por ${occupyingPatient ? formatPatientShortName(occupyingPatient) : 'otro paciente'}`}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ocupado por {occupyingPatient ? formatPatientShortName(occupyingPatient) : 'otro paciente'}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
              const isSelected = state.selectedSlots.has(key);
              
              return (
                <button
                  key={`${dayIndex}-${time}-${subIndex}`}
                  className={`text-xs p-1 rounded border cursor-pointer transition-colors flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-ring relative z-[2] min-h-[56px] ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                      : 'border-dashed border-green-300 bg-green-50 hover:bg-green-100'
                  }`}
                  onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex + 1 })}
                  aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} turno ${time} sub-slot ${subIndex + 1}`}
                  tabIndex={0}
                >
                  <span className={isSelected ? 'text-blue-600' : 'text-green-600'}>
                    {isSelected ? '✓' : <Plus className="h-3 w-3" />}
                  </span>
                </button>
              );
            }
            return null;
          })}
        </div>
      );
    }

    // Slot completamente vacío - mostrar todos los sub-slots disponibles (60px cada uno)
    return (
      <div key={`${dayIndex}-${time}`} className="p-1 border border-gray-400 grid gap-1" 
           style={{ gridTemplateRows: 'repeat(5, 60px)' }}>
         {Array.from({ length: 5 }).map((_, subIndex) => {
           if (subIndex >= capacity) {
             return <div key={`${dayIndex}-${time}-${subIndex}`} className="bg-gray-100" />;
           }
           
           const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
           const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });

           // Verificar si está bloqueado por tratamiento exclusivo
           if (isBlockedByExclusive(dayIndex, time, state.filterPractitionerId || undefined)) {
             return (
               <Tooltip key={`${dayIndex}-${time}-${subIndex}`}>
                 <TooltipTrigger asChild>
                   <div
                     className="text-xs p-1 rounded bg-muted border border-destructive/30 flex items-center justify-center cursor-not-allowed min-h-[56px]"
                     aria-label="Bloqueado: tratamiento exclusivo en este horario"
                   >
                     <Lock className="h-3 w-3 text-destructive/60" />
                   </div>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Bloqueado: tratamiento exclusivo en este horario</p>
                 </TooltipContent>
               </Tooltip>
             );
           }
           
           // Verificar si está ocupado por otro profesional
           if (isOccupiedByOtherPractitioner(key)) {
             const occupyingApt = allAppointmentsBySlotKey.get(key);
             const occupyingPractitioner = occupyingApt 
               ? state.practitioners.find(p => p.id === occupyingApt.practitionerId)
               : null;
             
             return (
               <Tooltip key={`${dayIndex}-${time}-${subIndex}`}>
                 <TooltipTrigger asChild>
                   <div
                     className="text-xs p-1 rounded bg-muted border border-border flex items-center justify-center cursor-not-allowed"
                     aria-label={`Ocupado por ${occupyingPractitioner?.name || 'otro profesional'}`}
                   >
                     <X className="h-3 w-3 text-muted-foreground" />
                   </div>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Ocupado por {occupyingPractitioner?.name || 'otro profesional'}</p>
                 </TooltipContent>
               </Tooltip>
             );
           }

           // Verificar si está ocupado por otro paciente
           if (isOccupiedByOtherPatient(key)) {
             const occupyingApt = allAppointmentsBySlotKey.get(key);
             const occupyingPatient = occupyingApt
               ? state.patients.find(p => p.id === occupyingApt.patientId)
               : null;
             
             return (
               <Tooltip key={`${dayIndex}-${time}-${subIndex}`}>
                 <TooltipTrigger asChild>
                   <div
                     className="text-xs p-1 rounded bg-muted border border-border flex items-center justify-center cursor-not-allowed"
                     aria-label={`Ocupado por ${occupyingPatient ? formatPatientShortName(occupyingPatient) : 'otro paciente'}`}
                   >
                     <X className="h-3 w-3 text-muted-foreground" />
                   </div>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Ocupado por {occupyingPatient ? formatPatientShortName(occupyingPatient) : 'otro paciente'}</p>
                 </TooltipContent>
               </Tooltip>
             );
           }
           
           const isSelected = state.selectedSlots.has(key);
           
            return (
              <button
                 key={`${dayIndex}-${time}-${subIndex}`}
                 className={`text-xs p-1 rounded border cursor-pointer transition-colors flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-ring relative z-[2] min-h-[56px] ${
                   isSelected 
                     ? 'border-2 border-blue-500 bg-blue-50 hover:bg-blue-100' 
                     : 'border border-dashed border-green-300 bg-green-50 hover:bg-green-100'
                 }`}
                onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex + 1 })}
                aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} turno ${time} sub-slot ${subIndex + 1}`}
               tabIndex={0}
             >
               <span className={isSelected ? 'text-blue-600' : 'text-green-600'}>
                 {isSelected ? '✓' : <Plus className="h-3 w-3" />}
               </span>
             </button>
           );
         })}
      </div>
    );
  };

  // Obtener nombre del profesional filtrado
  const filteredPractitionerName = state.filterPractitionerId 
    ? state.practitioners.find(p => p.id === state.filterPractitionerId)?.name 
    : undefined;

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Agenda
          </h1>
          
          {/* Filtros de profesional y paciente */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Filtro de profesional */}
            <div className="flex items-center gap-1">
              <Select
                value={state.filterPractitionerId ?? 'all'}
                onValueChange={(value) => dispatch({ type: 'SET_FILTER_PRACTITIONER', payload: value === 'all' ? undefined : value })}
              >
                <SelectTrigger className="h-9 w-full sm:w-[200px]">
                  <User className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Todos los profesionales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los profesionales</SelectItem>
                  {state.practitioners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.filterPractitionerId && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => dispatch({ type: 'SET_FILTER_PRACTITIONER', payload: undefined })}
                  className="h-9 w-9 p-0 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Buscador de paciente */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar paciente..."
                value={state.filterPatientSearch ?? ''}
                onChange={(e) => dispatch({ type: 'SET_FILTER_PATIENT_SEARCH', payload: e.target.value || undefined })}
                className="pl-8 h-9 w-full sm:w-[180px]"
              />
              {state.filterPatientSearch && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => dispatch({ type: 'SET_FILTER_PATIENT_SEARCH', payload: undefined })}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Badges de filtros activos */}
        <div className="flex gap-2 flex-wrap">
          {filteredPractitionerName && (
            <Badge variant="secondary">
              Profesional: {filteredPractitionerName}
            </Badge>
          )}
          {state.filterPatientSearch && (
            <Badge variant="secondary">
              Paciente: "{state.filterPatientSearch}"
            </Badge>
          )}
        </div>
        
        {agendaBanner?.type === 'error' && (
          <div className="w-full mt-2 text-sm font-medium text-red-600">
            {agendaBanner.text}
          </div>
        )}
        <p className="text-muted-foreground">
          Gestiona turnos y horarios de kinesiología
        </p>
      </div>

      {/* Rest of component remains the same */}
      <div className="space-y-4">

        {/* Clear selection button */}
        {isMultiSelectEnabled && state.selectedSlots.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm text-blue-900 shrink-0">
                  {state.selectedSlots.size} horario{state.selectedSlots.size !== 1 ? 's' : ''} seleccionado{state.selectedSlots.size !== 1 ? 's' : ''}
                </span>
                {state.selectedSlots.size > 0 && isMultiSelectEnabled && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <KinesioCombobox
                      value={state.selectedPractitionerId}
                      onChange={(practitionerId) => dispatch({ type: 'SET_SELECTED_PRACTITIONER', payload: practitionerId })}
                      options={state.practitioners.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="Selecciona Kinesiólogo"
                      className="text-xs w-full sm:w-auto"
                    />
                    <DynamicTreatmentSelect
                      value={state.selectedTreatmentType ?? ''}
                      onValueChange={(value) => dispatch({ type: 'SET_SELECTED_TREATMENT_TYPE', payload: value as TreatmentType })}
                      className="h-8 text-xs w-full sm:w-[200px]"
                      practitionerId={state.selectedPractitionerId || undefined}
                    />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="text-blue-700 hover:text-blue-900 h-6 w-6 p-0 self-end sm:self-auto shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
              {Array.from(state.selectedSlots)
                .sort((a, b) => {
                  const aSlot = a.split('_');
                  const bSlot = b.split('_');
                  if (aSlot[0] !== bSlot[0]) return aSlot[0].localeCompare(bSlot[0]);
                  if (aSlot[1] !== bSlot[1]) return aSlot[1].localeCompare(bSlot[1]);
                  return parseInt(aSlot[2]) - parseInt(bSlot[2]);
                })
                .map((key) => {
                  const { dateISO, hour, subSlot } = parseSlotKey(key);
                  const displayText = displaySelectedLabel({ dateISO, hour, subSlot: (subSlot + 1) as 1 | 2 | 3 | 4 | 5 });
                  
                  return (
                    <div key={key} className="flex items-center justify-between text-sm bg-white rounded p-2">
                      <span className="text-blue-900">
                        {displayText}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSelect(key)}
                        className="h-4 w-4 p-0 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={confirmSelection} 
                className="flex-1"
                disabled={state.selectedSlots.size === 0 || !state.selectedPractitionerId || !state.selectedTreatmentType}
              >
                Confirmar selección
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpiar
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Navegación de semana */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {format(weekDates[0], 'd MMM', { locale: es })} - {format(weekDates[4], 'd MMM yyyy', { locale: es })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Vista Desktop/Tablet - Grid semanal */}
          <div className="hidden md:block">
            {(loadingAppointments || loadingSettings) ? (
              <LoadingSkeleton variant="calendar" />
            ) : (
              <div className="relative z-0 overflow-hidden">
                {/* Navegador de semana compacto - fuera del scroll */}
                <div className="flex justify-end px-2 py-1 bg-background">
                  <WeekNavigatorCompact />
                </div>
                <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
                  <div 
                    className="w-full"
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'minmax(70px, 88px) repeat(5, minmax(100px, 1fr))',
                      gap: '0px',
                      width: '100%'
                    }}
                  >
                  {/* Header - 6 celdas directas del grid (sticky) */}
                  <div className="p-2 text-sm font-medium text-muted-foreground border-b-2 border-r-2 border-gray-400 bg-muted/10 flex items-center sticky top-0 z-20 bg-background">
                    Hora
                  </div>
                  {WEEKDAYS.map((day, index) => {
                    const dateISO = format(weekDates[index], 'yyyy-MM-dd');
                    const dayExceptions = exceptionsMap.get(dateISO) || [];
                    
                    // Filtrar excepciones relevantes según el profesional seleccionado
                    const relevantExceptions = state.filterPractitionerId
                      ? dayExceptions.filter(e => 
                          e.type === 'clinic_closed' || e.isHoliday || 
                          (e.type === 'practitioner_block' && e.practitionerId === state.filterPractitionerId)
                        )
                      : dayExceptions;
                    
                    const isClosed = relevantExceptions.some(e => e.type === 'clinic_closed' || e.isHoliday);
                    const hasBlock = relevantExceptions.some(e => e.type === 'practitioner_block');
                    const closedReason = relevantExceptions.find(e => e.type === 'clinic_closed' || e.isHoliday);
                    
                    // Para el tooltip: mostrar todas pero con nombre del profesional
                    const tooltipExceptions = state.filterPractitionerId ? relevantExceptions : dayExceptions;
                    const hasTooltip = isClosed || hasBlock || (!state.filterPractitionerId && dayExceptions.some(e => e.type === 'practitioner_block'));
                    
                    return (
                      <Tooltip key={day}>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "p-1 border-b-2 border-r border-gray-400 flex flex-col items-center justify-center sticky top-0 z-20",
                              isClosed ? 'bg-red-50 border-red-200' : hasBlock ? 'bg-amber-50 border-amber-200' : 'bg-background'
                            )}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">{day}</span>
                              {isClosed && <AlertTriangle className="h-3 w-3 text-red-500" />}
                              {!isClosed && hasBlock && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(weekDates[index], 'd MMM', { locale: es })}
                            </div>
                            {isClosed && closedReason && (
                              <div className="text-[9px] text-red-600 truncate max-w-full px-1">
                                {closedReason.reason || closedReason.holidayName || 'Cerrado'}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        {hasTooltip && (
                          <TooltipContent>
                            {tooltipExceptions.map((e, i) => (
                              <p key={i}>
                                {e.isHoliday 
                                  ? `🏖️ ${e.holidayName}` 
                                  : e.type === 'practitioner_block' && e.practitionerName
                                    ? `⚠️ ${e.practitionerName}: ${e.reason || TYPE_LABELS_CAL[e.type] || e.type}`
                                    : `⚠️ ${e.reason || TYPE_LABELS_CAL[e.type] || e.type}`
                                }
                              </p>
                            ))}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}

                  {/* Slots de tiempo - 6 celdas directas del grid por fila */}
                  {TIME_SLOTS.map((time) => (
                    <React.Fragment key={time}>
                      <div data-time-row={time} className="p-2 text-sm text-muted-foreground border-r-2 border-b border-gray-400 bg-muted/10 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {time}
                      </div>
                      {WEEKDAYS.map((_, dayIndex) => (
                        <div key={`${time}-${dayIndex}`} className="border-r border-b border-gray-400">
                          {renderSlot(dayIndex, time)}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Vista Mobile - Tabs por día */}
          <div className="md:hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
            <Tabs value={selectedDay.toString()} onValueChange={(v) => changeMobileDay(parseInt(v))} className="flex flex-col flex-1 min-h-0">
              {/* Sticky header: week nav + day tabs */}
              <div className="sticky top-0 z-10 bg-background pb-2 border-b">
                <div className="flex justify-end mb-2">
                  <WeekNavigatorCompact />
                </div>
                <TabsList className="grid w-full grid-cols-5">
                  {MOBILE_WEEKDAYS.map((day, index) => (
                    <TabsTrigger key={index} value={index.toString()} className="text-xs">
                      <div className="text-center">
                        <div>{day}</div>
                        <div className="text-xs">{format(weekDates[index], 'd', { locale: es })}</div>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Scrollable content with swipe support */}
              <div ref={mobileScrollRef} className="flex-1 overflow-y-auto mt-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {WEEKDAYS.map((_, dayIndex) => (
                  <TabsContent key={dayIndex} value={dayIndex.toString()} className="mt-0">
                    {(loadingAppointments || loadingSettings) ? (
                      <LoadingSkeleton variant="cards" />
                    ) : (
                      <div className="space-y-1">
                         {TIME_SLOTS.map((time) => {
                            const capacity = getSlotCapacity(dayIndex, time);
                            const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
                            
                            // Obtener citas usando el índice de sub-slots
                            const slotAppointments = Array.from({ length: 5 }, (_, subIndex) => {
                              const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });
                              return appointmentsBySlotKey.get(key);
                            });
                            
                            const appointmentCount = slotAppointments.filter(apt => apt !== undefined).length;
                           
                           return (
                             <div key={time} data-time-row-mobile={time} className="space-y-1">
                               <div className="flex items-center gap-2 mb-2">
                                 <Clock className="h-4 w-4 text-muted-foreground" />
                                 <span className="font-medium">{time}</span>
                                 <span className="text-xs text-muted-foreground">
                                   ({appointmentCount}/{capacity})
                                 </span>
                               </div>
                               
                               {Array.from({ length: capacity }).map((_, subIndex) => {
                                 const appointment = slotAppointments[subIndex];
                                
                                 if (appointment) {
                                   const patient = state.patients.find(p => p.id === appointment.patientId);
                                   const practitioner = state.practitioners.find(p => p.id === appointment.practitionerId);
                                   const styles = getPractitionerStyles(appointment.practitionerId);
                                   const canShowCheckbox = appointment.practitionerId && appointment.patientId && appointment.status !== 'cancelled';
                                   const isCompleted = appointment.status === 'completed';
                                   const hasPermission = ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'].includes(state.userRole);
                                   
                                    return (
                                      <Card
                                        key={`${time}-${subIndex}`}
                                        className="p-3 cursor-pointer border-l-4 hover:opacity-80 transition-colors relative"
                                        style={{ borderLeftColor: getPractitionerColor(appointment.practitionerId) }}
                                        onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                                      >
                                        {isExclusiveTreatment(appointment) && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <AlertTriangle className="h-3.5 w-3.5 text-destructive absolute top-2 right-2" />
                                            </TooltipTrigger>
                                            <TooltipContent><p>Tratamiento exclusivo</p></TooltipContent>
                                          </Tooltip>
                                        )}
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="font-medium text-sm truncate">
                                                 {patient ? formatPatientShortName(patient) : 'Paciente'}
                                                 {appointment.patientId && firstVisitPatients.get(appointment.patientId) === appointment.date && (
                                                   <span className="ml-1 inline-flex items-center justify-center bg-blue-600 text-white text-[9px] font-bold rounded px-1 leading-tight" title="Primera visita">N</span>
                                                 )}
                                               </div>
                                               <span className={`inline-block px-2 py-1 text-xs rounded ${
                                                 appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                 appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                 appointment.status === 'no_show' ? 'bg-red-100 text-red-800' :
                                                 'bg-gray-100 text-gray-800'
                                               }`}>
                                                  {statusLabel(appointment.status as AppointmentStatus)}
                                               </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                              <User className="h-3 w-3" />
                                              <span className="truncate">{practitioner?.name || 'Profesional'}</span>
                                            </div>
                                          </div>
                          {hasPermission && appointment.practitionerId && appointment.patientId && (
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={statusToChecked(appointment.status as Status) === true ? 'true' : statusToChecked(appointment.status as Status) === 'indeterminate' ? 'mixed' : 'false'}
                              onClick={(e) => { e.stopPropagation(); onTriToggle(appointment); }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer bg-background ml-2"
                              data-state={statusToChecked(appointment.status as Status) === true ? 'checked' : statusToChecked(appointment.status as Status) === 'indeterminate' ? 'indeterminate' : 'unchecked'}
                            >
                              {statusToChecked(appointment.status as Status) === true && <Check className="h-4 w-4 text-green-600" />}
                              {statusToChecked(appointment.status as Status) === 'indeterminate' && <X className="h-4 w-4 text-red-600" />}
                            </button>
                          )}
                                        </div>
                                      </Card>
                                    );
                                  } else {
                                    const dateISO = format(weekDates[dayIndex], 'yyyy-MM-dd');
                                    const key = getSlotKey({ dateISO, hour: time, subSlot: subIndex });

                                     // Verificar si está bloqueado por tratamiento exclusivo
                                     if (isBlockedByExclusive(dayIndex, time, state.filterPractitionerId || undefined)) {
                                       return (
                                         <Card
                                           key={`${time}-${subIndex}`}
                                           className="p-3 border-dashed bg-muted border-destructive/30 cursor-not-allowed"
                                         >
                                           <div className="flex items-center justify-center gap-1">
                                             <Lock className="h-3.5 w-3.5 text-destructive/60" />
                                             <span className="text-xs text-muted-foreground">Exclusivo</span>
                                           </div>
                                         </Card>
                                       );
                                     }
                                     
                                     // Verificar si está ocupado por otro profesional
                                     if (isOccupiedByOtherPractitioner(key)) {
                                       return (
                                         <Card
                                           key={`${time}-${subIndex}`}
                                           className="p-3 border-dashed bg-muted cursor-not-allowed"
                                         >
                                           <div className="flex items-center justify-center">
                                             <X className="h-4 w-4 text-muted-foreground" />
                                           </div>
                                         </Card>
                                       );
                                     }

                                     // Verificar si está ocupado por otro paciente
                                     if (isOccupiedByOtherPatient(key)) {
                                       return (
                                         <Card
                                           key={`${time}-${subIndex}`}
                                           className="p-3 border-dashed bg-muted cursor-not-allowed"
                                         >
                                           <div className="flex items-center justify-center">
                                             <X className="h-4 w-4 text-muted-foreground" />
                                           </div>
                                         </Card>
                                       );
                                     }
                                    
                                    const isSelected = state.selectedSlots.has(key);
                                    
                                    return (
                                      <Card
                                        key={`${time}-${subIndex}`}
                                        className={`p-3 cursor-pointer border-dashed transition-colors ${
                                          isSelected 
                                            ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' 
                                            : 'border-green-300 bg-green-50 hover:bg-green-100'
                                        }`}
                                        onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
                                      >
                                        <div className="flex items-center justify-center">
                                          <span className={`text-lg ${isSelected ? 'text-blue-600' : 'text-green-600'}`}>
                                            {isSelected ? '✓' : <Plus className="h-4 w-4" />}
                                          </span>
                                        </div>
                                      </Card>
                                    );
                                  }
                                return null;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </CardContent>
      </Card>


      {/* Modal Nuevo Turno */}
      <NewAppointmentDialog
        open={showNewAppointmentModal}
        onOpenChange={(open) => {
          setShowNewAppointmentModal(open);
          if (!open) setPreselectedPatientId(null);
        }}
        selectedSlot={selectedSlot}
        preselectedPatientId={preselectedPatientId ?? undefined}
      />

      <AppointmentDetailDialog
        open={!!selectedAppointmentId}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
        appointmentId={selectedAppointmentId}
        onAppointmentChange={(appointmentId) => setSelectedAppointmentId(appointmentId)}
      />

      <MassCreateAppointmentDialog
        open={showMassCreateModal}
        onOpenChange={(open) => {
          setShowMassCreateModal(open);
          if (!open) setPreselectedPatientId(null);
        }}
        selectedSlotKeys={Array.from(state.selectedSlots)}
        preselectedPatientId={preselectedPatientId ?? undefined}
      />

      {/* FAB "+ Nuevo turno" para mobile */}
      <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'receptionist']}>
        <FloatingActionButton
          onClick={() => {
            setSelectedSlot({
              day: selectedDay,
              time: TIME_SLOTS[0] || '08:00',
              date: weekDates[selectedDay],
            });
            setShowNewAppointmentModal(true);
          }}
          ariaLabel="Nuevo turno"
        >
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      </RoleGuard>

      {/* Estado vacío */}
      {!state.isDemoMode && dbAppointments.length === 0 && !loadingAppointments && !loadingSettings && (
        <EmptyState
          icon={<CalendarIcon className="h-12 w-12" />}
          title="No hay turnos programados"
          description="Comienza creando tu primer turno o activa el modo demo para ver datos de ejemplo"
          action={{
            label: "Crear primer turno",
            onClick: () => setShowNewAppointmentModal(true),
            disabled: !['admin', 'recep'].includes(state.userRole),
            'aria-label': 'Crear el primer turno del calendario'
          }}
        />
      )}
    </div>
  );
};
