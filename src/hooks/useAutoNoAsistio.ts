import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Hook que marca automáticamente como "no_show" las citas pasadas con status "scheduled".
 * Opera directamente sobre la base de datos.
 */
export const useAutoNoAsistio = () => {
  const { state } = useApp();
  const lastCheckedDateRef = useRef<string>(todayISO());

  const executeAutoNoAsistio = async () => {
    if (!state.currentClinicId) return;

    try {
      const today = todayISO();
      
      // Actualizar citas pasadas con status 'scheduled' a 'no_show'
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'no_show', updated_at: new Date().toISOString() })
        .eq('clinic_id', state.currentClinicId)
        .eq('status', 'scheduled')
        .lt('date', today)
        .select('id');

      if (error) {
        console.error('Error executing auto no-show:', error);
        return;
      }

      const count = data?.length || 0;
      if (count > 0) {
        toast({
          title: "Actualización automática",
          description: `Se marcaron ${count} turnos como No Asistió`,
        });
        
        // Trigger refresh en Calendar
        window.dispatchEvent(new Event('appointmentUpdated'));
      }
    } catch (err) {
      console.error('Error in executeAutoNoAsistio:', err);
    }
  };

  useEffect(() => {
    if (!state.currentClinicId) return;

    // Ejecutar al cargar
    executeAutoNoAsistio();

    // Detectar rollover de día (cada 60s)
    const intervalId = window.setInterval(() => {
      const currentDate = todayISO();
      if (currentDate !== lastCheckedDateRef.current) {
        lastCheckedDateRef.current = currentDate;
        executeAutoNoAsistio();
      }
    }, 60_000);

    // Ejecutar al volver a la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        executeAutoNoAsistio();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.currentClinicId]);
};
