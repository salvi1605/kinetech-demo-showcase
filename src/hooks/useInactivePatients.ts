import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Patient } from '@/contexts/AppContext';

export const useInactivePatients = (clinicId?: string) => {
  const [patients, setPatients] = useState<(Patient & { deletedAt?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInactivePatients = useCallback(async () => {
    if (!clinicId) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = (data || []).map(p => ({
        id: p.id,
        name: p.full_name,
        email: p.email || '',
        phone: p.phone || '',
        birthDate: p.date_of_birth || '',
        conditions: [],
        first_surname: (p as any).first_surname || null,
        second_surname: (p as any).second_surname || null,
        first_name: (p as any).first_name || null,
        second_name: (p as any).second_name || null,
        identificacion: {
          fullName: p.full_name,
          preferredName: p.preferred_name || '',
          documentId: p.document_id || undefined,
          mobilePhone: p.phone || '',
          email: p.email || '',
        },
        deletedAt: p.deleted_at || undefined,
      }));

      setPatients(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching inactive patients:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchInactivePatients();
  }, [fetchInactivePatients]);

  return { patients, loading, error, refetch: fetchInactivePatients };
};
