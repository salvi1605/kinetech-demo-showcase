import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  user_roles: Array<{
    id: string;
    role_id: string;
    clinic_id: string;
    active: boolean | null;
  }>;
}

export interface Role {
  id: string;
  description: string | null;
}

export function useClinicUsers(clinicId: string | null) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!clinicId) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch users who have roles in this clinic
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          role_id,
          clinic_id,
          active,
          user_id
        `)
        .eq('clinic_id', clinicId);

      if (rolesError) throw rolesError;

      if (!userRolesData || userRolesData.length === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(userRolesData.map(ur => ur.user_id))];

      // Fetch user details
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, phone, is_active, created_at')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Combine users with their roles
      const usersWithRoles: UserWithRole[] = (usersData || []).map(user => ({
        ...user,
        user_roles: userRolesData
          .filter(ur => ur.user_id === user.id)
          .map(ur => ({
            id: ur.id,
            role_id: ur.role_id,
            clinic_id: ur.clinic_id,
            active: ur.active,
          })),
      }));

      setUsers(usersWithRoles);
    } catch (err: any) {
      console.error('Error fetching clinic users:', err);
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, [clinicId]);

  const fetchRoles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, description');

      if (error) throw error;
      setRoles(data || []);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const refetch = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, roles, isLoading, error, refetch };
}
