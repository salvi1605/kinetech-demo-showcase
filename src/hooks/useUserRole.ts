import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export type EffectiveRole = 'tenant_owner' | 'admin_clinic' | 'receptionist' | 'health_pro' | null;

interface UseUserRoleResult {
  effectiveRole: EffectiveRole;
  isAdmin: boolean; // tenant_owner OR admin_clinic
  isTenantOwner: boolean;
  isLoading: boolean;
}

export const useUserRole = (): UseUserRoleResult => {
  const { state } = useApp();
  const [effectiveRole, setEffectiveRole] = useState<EffectiveRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!state.currentClinicId || !state.currentUser?.id) {
        setEffectiveRole(null);
        setIsLoading(false);
        return;
      }

      try {
        // Get the current auth user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setEffectiveRole(null);
          setIsLoading(false);
          return;
        }

        // Get the public.users record for this auth user
        const { data: publicUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .single();

        if (!publicUser) {
          setEffectiveRole(null);
          setIsLoading(false);
          return;
        }

        // Get the role for this user in the current clinic
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', publicUser.id)
          .eq('clinic_id', state.currentClinicId)
          .eq('active', true);

        if (!userRoles || userRoles.length === 0) {
          setEffectiveRole(null);
          setIsLoading(false);
          return;
        }

        // Determine effective role (highest privilege)
        const roleIds = userRoles.map(r => r.role_id);
        
        if (roleIds.includes('tenant_owner')) {
          setEffectiveRole('tenant_owner');
        } else if (roleIds.includes('admin_clinic')) {
          setEffectiveRole('admin_clinic');
        } else if (roleIds.includes('receptionist')) {
          setEffectiveRole('receptionist');
        } else if (roleIds.includes('health_pro')) {
          setEffectiveRole('health_pro');
        } else {
          setEffectiveRole(null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setEffectiveRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [state.currentClinicId, state.currentUser?.id]);

  return {
    effectiveRole,
    isAdmin: effectiveRole === 'tenant_owner' || effectiveRole === 'admin_clinic',
    isTenantOwner: effectiveRole === 'tenant_owner',
    isLoading,
  };
};
