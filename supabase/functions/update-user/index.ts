import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  'https://agendixpro.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

// Cryptographically secure password generation
function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(v => charset[v % charset.length])
    .join('');
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role_id, clinic_id')
      .eq('user_id', currentUser.id)
      .eq('active', true);

    const isSuperAdmin = adminRoles?.some(r => r.role_id === 'super_admin' && r.clinic_id === null) ?? false;
    const adminClinicIds = new Set(
      (adminRoles ?? [])
        .filter(r => (r.role_id === 'admin_clinic' || r.role_id === 'tenant_owner') && r.clinic_id)
        .map(r => r.clinic_id as string)
    );
    const isAdmin = isSuperAdmin || adminClinicIds.size > 0;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, userId, fullName, email, roleId, roleIds, clinicId, isActive } = body;

    // Helper: caller must administer the clinic where the target user belongs (or be super_admin)
    const assertCanManageTargetUser = async (): Promise<Response | null> => {
      if (isSuperAdmin) return null;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId requerido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: targetClinics } = await supabaseAdmin
        .from('user_roles')
        .select('clinic_id')
        .eq('user_id', userId)
        .eq('active', true);
      const targetClinicIds = (targetClinics ?? []).map(r => r.clinic_id).filter(Boolean) as string[];
      // Caller must administer at least one clinic that the target user belongs to
      const overlap = targetClinicIds.some(cid => adminClinicIds.has(cid));
      if (!overlap) {
        return new Response(JSON.stringify({ error: 'No tienes permisos sobre este usuario' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return null;
    };

    const assertCanManageClinic = (targetClinicId: string | null | undefined): Response | null => {
      if (isSuperAdmin) return null;
      if (!targetClinicId || !adminClinicIds.has(targetClinicId)) {
        return new Response(JSON.stringify({ error: 'No tienes permisos sobre la clínica destino' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return null;
    };

    // Prevent admin from deactivating themselves
    if (action === 'toggle_active' && userId === currentUser.id && !isActive) {
      return new Response(JSON.stringify({ error: 'No puedes desactivarte a ti mismo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    let result: any = {};

    if (action === 'update_profile') {
      const denied = await assertCanManageTargetUser();
      if (denied) return denied;

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ full_name: fullName, email: email })
        .eq('id', userId);

      if (updateError) throw updateError;

      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('auth_user_id')
        .eq('id', userId)
        .single();

      if (targetUser?.auth_user_id) {
        await supabaseAdmin.auth.admin.updateUserById(targetUser.auth_user_id, { email });
      }

      result.message = 'Perfil actualizado correctamente';
    }

    // Legacy single-role update (kept for backward compat)
    if (action === 'update_role') {
      if (roleId === 'super_admin' && !isSuperAdmin) {
        return new Response(JSON.stringify({ error: 'Solo un super_admin puede asignar el rol super_admin' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const denied = assertCanManageClinic(clinicId);
      if (denied) return denied;

      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('clinic_id', clinicId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          clinic_id: clinicId,
          active: true
        });

      if (insertError) throw insertError;

      result.message = 'Rol actualizado correctamente';
    }

    // Multi-role update: accepts roleIds: string[]
    if (action === 'update_roles') {
      if (!Array.isArray(roleIds) || roleIds.length === 0) {
        return new Response(JSON.stringify({ error: 'Debe asignar al menos un rol' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (roleIds.includes('super_admin') && !isSuperAdmin) {
        return new Response(JSON.stringify({ error: 'Solo un super_admin puede asignar el rol super_admin' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const denied = assertCanManageClinic(clinicId);
      if (denied) return denied;

      // Delete existing roles for this user in this clinic (except super_admin which is global)
      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('clinic_id', clinicId)
        .neq('role_id', 'super_admin');

      if (deleteError) throw deleteError;

      // Insert all selected roles (super_admin is global → clinic_id null)
      const inserts = roleIds.map((rid: string) => ({
        user_id: userId,
        role_id: rid,
        clinic_id: rid === 'super_admin' ? null : clinicId,
        active: true,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert(inserts);

      if (insertError) throw insertError;

      result.message = 'Roles actualizados correctamente';
    }

    if (action === 'toggle_active') {
      const denied = await assertCanManageTargetUser();
      if (denied) return denied;

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (updateError) throw updateError;

      result.message = isActive ? 'Usuario activado' : 'Usuario desactivado';
    }

    if (action === 'reset_password') {
      const denied = await assertCanManageTargetUser();
      if (denied) return denied;

      const tempPassword = generateSecurePassword(16);

      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('auth_user_id')
        .eq('id', userId)
        .single();

      if (!targetUser?.auth_user_id) {
        throw new Error('Auth user not found');
      }

      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.auth_user_id,
        { password: tempPassword }
      );

      if (resetError) throw resetError;

      result.message = 'Contraseña restablecida';
      result.tempPassword = tempPassword;
    }


    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-user function');
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
