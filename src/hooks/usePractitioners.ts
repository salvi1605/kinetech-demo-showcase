import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Practitioner } from '@/contexts/AppContext';

export const usePractitioners = (clinicId?: string) => {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
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
      const { data, error: fetchError } = await supabase
        .from('practitioners')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('display_name', { ascending: true });

      if (fetchError) throw fetchError;

      const mapped: Practitioner[] = (data || []).map(p => ({
        id: p.id,
        name: p.display_name,
        specialty: p.specialties?.[0] || 'Kinesiólogo',
        email: '', // No disponible en BD
        phone: '', // No disponible en BD
        schedule: [], // Se maneja por practitioner_availability
        color: p.color || '#3b82f6',
      }));

      setPractitioners(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching practitioners:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

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
