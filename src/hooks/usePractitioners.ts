import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Practitioner } from '@/contexts/AppContext';

export interface PractitionerWithStatus extends Practitioner {
  isActive: boolean;
}

export const usePractitioners = (clinicId?: string, includeInactive: boolean = false) => {
  const [practitioners, setPractitioners] = useState<PractitionerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPractitioners = useCallback(async () => {
    if (!clinicId) {
      setPractitioners([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('practitioners')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('display_name', { ascending: true });

      // Solo filtrar por activos si no se incluyen inactivos
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped: PractitionerWithStatus[] = (data || []).map(p => ({
        id: p.id,
        name: p.display_name,
        specialty: p.specialties?.[0] || 'Kinesiólogo',
        email: p.email || '',
        phone: p.phone || '',
        schedule: [],
        color: p.color || '#3b82f6',
        isActive: p.is_active ?? true,
      }));

      setPractitioners(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching practitioners:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [clinicId, includeInactive]);

  useEffect(() => {
    fetchPractitioners();
  }, [fetchPractitioners]);

  // Escuchar evento de actualización de profesionales
  useEffect(() => {
    const handlePractitionerUpdated = () => {
      fetchPractitioners();
    };

    window.addEventListener('practitionerUpdated', handlePractitionerUpdated);
    return () => {
      window.removeEventListener('practitionerUpdated', handlePractitionerUpdated);
    };
  }, [fetchPractitioners]);

  return { practitioners, loading, error, refetch: fetchPractitioners };
};
