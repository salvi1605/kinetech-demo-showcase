import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnlinkedPractitioner {
  id: string;
  display_name: string;
  specialty: string;
}

/**
 * Carga practitioners que:
 * - Pertenecen a la clínica actual
 * - user_id IS NULL (no están vinculados a ningún usuario)
 */
export function useUnlinkedPractitioners(clinicId: string | null) {
  const [practitioners, setPractitioners] = useState<UnlinkedPractitioner[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    if (!clinicId) {
      setPractitioners([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('practitioners')
        .select('id, display_name, specialties')
        .eq('clinic_id', clinicId)
        .is('user_id', null)
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      const mapped: UnlinkedPractitioner[] = (data || []).map(p => ({
        id: p.id,
        display_name: p.display_name,
        specialty: p.specialties?.[0] || '',
      }));

      setPractitioners(mapped);
    } catch (error) {
      console.error('Error loading unlinked practitioners:', error);
      setPractitioners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [clinicId]);

  return { practitioners, loading, refetch };
}
