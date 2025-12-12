import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AvailableUser {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Carga usuarios con rol health_pro que:
 * - Pertenecen a la clínica actual (clinicId)
 * - NO están ya vinculados a otro practitioner en esa clínica
 * 
 * @param clinicId - ID de la clínica actual
 * @param excludePractitionerId - ID del practitioner a excluir (para edición)
 */
export function useAvailableUsersForPractitioner(
  clinicId: string | null,
  excludePractitionerId?: string
) {
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) {
      setUsers([]);
      return;
    }

    const loadAvailableUsers = async () => {
      setLoading(true);
      try {
        // 1. Obtener todos los usuarios con rol health_pro en esta clínica
        const { data: healthProUsers, error: usersError } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            users!inner (
              id,
              full_name,
              email
            )
          `)
          .eq('clinic_id', clinicId)
          .eq('role_id', 'health_pro')
          .eq('active', true);

        if (usersError) throw usersError;

        // 2. Obtener practitioners que ya tienen user_id en esta clínica
        let linkedQuery = supabase
          .from('practitioners')
          .select('user_id')
          .eq('clinic_id', clinicId)
          .not('user_id', 'is', null);

        // Si estamos editando, excluir el practitioner actual
        if (excludePractitionerId) {
          linkedQuery = linkedQuery.neq('id', excludePractitionerId);
        }

        const { data: linkedPractitioners, error: linkedError } = await linkedQuery;

        if (linkedError) throw linkedError;

        const linkedUserIds = new Set(
          (linkedPractitioners || []).map(p => p.user_id).filter(Boolean)
        );

        // 3. Filtrar usuarios que NO están vinculados
        const availableUsers: AvailableUser[] = (healthProUsers || [])
          .filter(ur => !linkedUserIds.has(ur.user_id))
          .map(ur => ({
            id: ur.users.id,
            full_name: ur.users.full_name,
            email: ur.users.email,
          }));

        setUsers(availableUsers);
      } catch (error) {
        console.error('Error loading available users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadAvailableUsers();
  }, [clinicId, excludePractitionerId]);

  return { users, loading };
}
