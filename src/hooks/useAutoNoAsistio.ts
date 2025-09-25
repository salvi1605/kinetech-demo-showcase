import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useApp } from '@/contexts/AppContext';
import { runAutoNoAsistio } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

export const useAutoNoAsistio = () => {
  const { state, dispatch } = useApp();
  const lastCheckedDateRef = useRef<string>(todayISO());

  const executeAutoNoAsistio = () => {
    const count = runAutoNoAsistio(dispatch, state.appointments);
    if (count > 0) {
      toast({
        title: "Actualización automática",
        description: `Se marcaron ${count} turnos como No Asistió`,
      });
    }
  };

  useEffect(() => {
    // Backfill al cargar
    executeAutoNoAsistio();

    // Detectar rollover de día (cada 60s)
    const intervalId = window.setInterval(() => {
      const currentDate = todayISO();
      if (currentDate !== lastCheckedDateRef.current) {
        lastCheckedDateRef.current = currentDate;
        executeAutoNoAsistio();
      }
    }, 60_000);

    // Backfill al volver a la pestaña
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
  }, []);
};