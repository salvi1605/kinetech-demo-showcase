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
      .select('role_id')
      .eq('user_id', currentUser.id)
      .eq('active', true);

    const isAdmin = adminRoles?.some(r => r.role_id === 'admin_clinic' || r.role_id === 'tenant_owner');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, fullName, email, roleId, clinicId, isActive, resetPassword } = await req.json();

    // Prevent admin from deactivating themselves
    if (action === 'toggle_active' && userId === currentUser.id && !isActive) {
      return new Response(JSON.stringify({ error: 'No puedes desactivarte a ti mismo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any = {};

    if (action === 'update_profile') {
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

    if (action === 'update_role') {
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

    if (action === 'toggle_active') {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (updateError) throw updateError;

      result.message = isActive ? 'Usuario activado' : 'Usuario desactivado';
    }

    if (action === 'reset_password') {
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
