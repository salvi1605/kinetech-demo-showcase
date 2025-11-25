import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export interface ClinicSettings {
  id: string;
  clinic_id: string;
  min_slot_minutes: number;
  workday_start: string; // "HH:mm:ss"
  workday_end: string;   // "HH:mm:ss"
  allow_professional_self_block: boolean;
  auto_mark_no_show: boolean;
  auto_mark_no_show_time: string;
}

/**
 * Hook para leer la configuración de agenda de la clínica actual.
 * Lee desde clinic_settings en BD, no usa constantes hardcodeadas.
 */
export const useClinicSettings = () => {
  const { state } = useApp();
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.currentClinicId) {
      setIsLoading(false);
      setSettings(null);
      return;
    }

    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('clinic_settings')
          .select('*')
          .eq('clinic_id', state.currentClinicId)
          .single();

        if (fetchError) {
          // Si no existe, crear con defaults
          if (fetchError.code === 'PGRST116') {
            const { data: newSettings, error: insertError } = await supabase
              .from('clinic_settings')
              .insert({
                clinic_id: state.currentClinicId,
                min_slot_minutes: 30,
                workday_start: '08:00:00',
                workday_end: '19:00:00',
                allow_professional_self_block: true,
                auto_mark_no_show: true,
                auto_mark_no_show_time: '00:00:00',
              })
              .select()
              .single();

            if (insertError) throw insertError;
            setSettings(newSettings);
          } else {
            throw fetchError;
          }
        } else {
          setSettings(data);
        }
      } catch (err) {
        console.error('Error fetching clinic settings:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar configuración');
        // Fallback a defaults locales si falla
        setSettings({
          id: 'fallback',
          clinic_id: state.currentClinicId,
          min_slot_minutes: 30,
          workday_start: '08:00:00',
          workday_end: '19:00:00',
          allow_professional_self_block: true,
          auto_mark_no_show: true,
          auto_mark_no_show_time: '00:00:00',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [state.currentClinicId]);

  return { settings, isLoading, error };
};

/**
 * Helper para convertir "HH:mm:ss" a "HH:mm"
 */
export const formatTimeShort = (timeString: string): string => {
  return timeString.slice(0, 5); // "08:00:00" -> "08:00"
};

/**
 * Helper para generar slots de horarios según configuración
 */
export const generateTimeSlots = (
  workdayStart: string,
  workdayEnd: string,
  slotMinutes: number
): string[] => {
  const slots: string[] = [];
  const startHour = parseInt(workdayStart.split(':')[0]);
  const startMinute = parseInt(workdayStart.split(':')[1]);
  const endHour = parseInt(workdayEnd.split(':')[0]);
  const endMinute = parseInt(workdayEnd.split(':')[1]);

  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  while (currentMinutes <= endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    currentMinutes += slotMinutes;
  }

  return slots;
};
