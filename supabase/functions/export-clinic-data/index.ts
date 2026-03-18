import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { buildClinicExport } from '../_shared/buildClinicExport.ts'

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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get user from token
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authUserId = claimsData.claims.sub

    // 2. Get clinic_id from body
    const { clinic_id } = await req.json()
    if (!clinic_id) {
      return new Response(JSON.stringify({ error: 'clinic_id es requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Validate role: user must be admin_clinic/tenant_owner for this clinic OR super_admin
    const { data: publicUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (!publicUser) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check super_admin (global, no clinic_id)
    const { data: superAdminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', publicUser.id)
      .eq('role_id', 'super_admin')
      .eq('active', true)
      .limit(1)

    const isSuperAdmin = (superAdminRoles?.length ?? 0) > 0

    if (!isSuperAdmin) {
      // Check admin_clinic or tenant_owner for THIS specific clinic
      const { data: clinicRoles } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', publicUser.id)
        .eq('clinic_id', clinic_id)
        .in('role_id', ['admin_clinic', 'tenant_owner'])
        .eq('active', true)
        .limit(1)

      if (!clinicRoles || clinicRoles.length === 0) {
        return new Response(JSON.stringify({ error: 'No tienes permisos para exportar datos de esta clínica' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 4. Export using shared logic
    const exportData = await buildClinicExport(supabaseAdmin, clinic_id, 'manual')

    return new Response(JSON.stringify(exportData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Export error:', error?.message || error)
    return new Response(JSON.stringify({ error: 'Error interno al exportar datos' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
