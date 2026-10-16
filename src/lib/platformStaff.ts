import { supabase } from '@/integrations/supabase/client';

/** IDs (public.users) de usuarios con rol super_admin activo: se ocultan en listas de equipo por clínica. */
export async function fetchPlatformStaffIds(): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_platform_staff_user_ids');
  if (error) {
    console.error('Error loading platform staff ids:', error);
    return new Set();
  }
  return new Set(((data as unknown as string[]) || []).filter(Boolean));
}
