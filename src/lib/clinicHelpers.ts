import { supabase } from '@/integrations/supabase/client';

/**
 * ID de la clínica base de Kinesiología Demo.
 * Esta es la clínica oficial con configuración de referencia.
 */
export const KINESIO_DEMO_CLINIC_ID = '82a05234-fea5-450c-8040-2dbb92905cbd';

/**
 * Configuración por defecto para nuevas clínicas.
 * Se puede clonar desde la clínica base.
 */
export const DEFAULT_CLINIC_SETTINGS = {
  min_slot_minutes: 30,
  workday_start: '08:00:00',
  workday_end: '19:00:00',
  allow_professional_self_block: true,
  auto_mark_no_show: true,
  auto_mark_no_show_time: '00:00:00',
};

/**
 * Obtiene la configuración de la clínica base (Kinesiología Demo).
 * Útil para clonar configuración al crear nuevas clínicas.
 */
export const getBaseClinicSettings = async () => {
  const { data, error } = await supabase
    .from('clinic_settings')
    .select('*')
    .eq('clinic_id', KINESIO_DEMO_CLINIC_ID)
    .single();

  if (error) {
    console.error('Error fetching base clinic settings:', error);
    return DEFAULT_CLINIC_SETTINGS;
  }

  return {
    min_slot_minutes: data.min_slot_minutes,
    workday_start: data.workday_start,
    workday_end: data.workday_end,
    allow_professional_self_block: data.allow_professional_self_block,
    auto_mark_no_show: (data as any).auto_mark_no_show ?? true,
    auto_mark_no_show_time: data.auto_mark_no_show_time,
  };
};

/**
 * Copia la configuración de la clínica base a una nueva clínica.
 * Para usar al crear nuevas clínicas en el futuro.
 */
export const cloneBaseSettingsToClinic = async (targetClinicId: string) => {
  const baseSettings = await getBaseClinicSettings();

  const { error } = await supabase
    .from('clinic_settings')
    .insert({
      clinic_id: targetClinicId,
      ...baseSettings,
    });

  if (error) {
    console.error('Error cloning clinic settings:', error);
    throw error;
  }

  return baseSettings;
};
