import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAutoNoAsistio = () => {
  useEffect(() => {
    const runAutoNoShow = async () => {
      try {
        console.log('[Auto No-Show] Ejecutando backfill...');
        
        const { error } = await supabase.rpc('auto_mark_no_show');
        
        if (error) {
          console.error('[Auto No-Show] Error:', error);
        } else {
          console.log('[Auto No-Show] ✓ Ejecutado correctamente');
        }
      } catch (err) {
        console.error('[Auto No-Show] Excepción:', err);
      }
    };

    // Ejecutar al montar
    runAutoNoShow();
    
    // Ejecutar cada hora
    const interval = setInterval(runAutoNoShow, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
};
