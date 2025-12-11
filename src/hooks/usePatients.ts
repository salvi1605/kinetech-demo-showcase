import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Patient } from '@/contexts/AppContext';

export const usePatients = (clinicId?: string) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatients = useCallback(async () => {
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
        .eq('is_deleted', false)
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;

      const mapped: Patient[] = (data || []).map(p => ({
        id: p.id,
        name: p.full_name,
        email: p.email || '',
        phone: p.phone || '',
        birthDate: p.date_of_birth || '',
        conditions: [],
        identificacion: {
          fullName: p.full_name,
          documentId: p.document_id || undefined,
          mobilePhone: p.phone || '',
          email: p.email || '',
        },
        emergencia: p.emergency_contact_name ? {
          contactName: p.emergency_contact_name,
          emergencyPhone: p.emergency_contact_phone || '',
        } : undefined,
      }));

      setPatients(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return { patients, loading, error, refetch: fetchPatients };
};
