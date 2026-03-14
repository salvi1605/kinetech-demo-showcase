import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

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

    // 4. Export all tables filtered by clinic_id
    const [
      clinicRes,
      settingsRes,
      patientsRes,
      practitionersRes,
      availabilityRes,
      treatmentTypesRes,
      practTreatmentsRes,
      appointmentsRes,
      clinicalNotesRes,
      documentsRes,
      exceptionsRes,
      holidaysRes,
      userRolesRes,
    ] = await Promise.all([
      supabaseAdmin.from('clinics').select('*').eq('id', clinic_id).single(),
      supabaseAdmin.from('clinic_settings').select('*').eq('clinic_id', clinic_id).maybeSingle(),
      supabaseAdmin.from('patients').select('*').eq('clinic_id', clinic_id).eq('is_deleted', false),
      supabaseAdmin.from('practitioners').select('*').eq('clinic_id', clinic_id),
      supabaseAdmin.from('practitioner_availability').select('*').eq('clinic_id', clinic_id),
      supabaseAdmin.from('treatment_types').select('*').eq('clinic_id', clinic_id),
      supabaseAdmin.from('practitioner_treatments').select('*').eq('clinic_id', clinic_id),
      supabaseAdmin.from('appointments').select('*').eq('clinic_id', clinic_id),
      supabaseAdmin.from('patient_clinical_notes').select('*').eq('clinic_id', clinic_id),
      // Documents: only metadata, exclude file_url
      supabaseAdmin.from('patient_documents').select('id, patient_id, clinic_id, file_type, description, uploaded_at, uploaded_by').eq('clinic_id', clinic_id),
      supabaseAdmin.from('schedule_exceptions').select('*').eq('clinic_id', clinic_id),
      supabaseAdmin.from('holiday_calendar').select('*').eq('clinic_id', clinic_id),
      supabaseAdmin.from('user_roles').select('id, user_id, role_id, clinic_id, active, created_at').eq('clinic_id', clinic_id),
    ])

    // Get user IDs from user_roles to fetch user details
    const userIds = [...new Set((userRolesRes.data || []).map((r: any) => r.user_id))]
    let usersData: any[] = []
    if (userIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email, phone, is_active, created_at')
        .in('id', userIds)
      usersData = data || []
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      clinic: clinicRes.data,
      clinic_settings: settingsRes.data,
      patients: patientsRes.data || [],
      practitioners: practitionersRes.data || [],
      practitioner_availability: availabilityRes.data || [],
      treatment_types: treatmentTypesRes.data || [],
      practitioner_treatments: practTreatmentsRes.data || [],
      appointments: appointmentsRes.data || [],
      patient_clinical_notes: clinicalNotesRes.data || [],
      patient_documents: documentsRes.data || [],
      schedule_exceptions: exceptionsRes.data || [],
      holiday_calendar: holidaysRes.data || [],
      users: usersData,
      user_roles: userRolesRes.data || [],
      totals: {
        patients: (patientsRes.data || []).length,
        practitioners: (practitionersRes.data || []).length,
        appointments: (appointmentsRes.data || []).length,
        clinical_notes: (clinicalNotesRes.data || []).length,
        documents: (documentsRes.data || []).length,
        treatment_types: (treatmentTypesRes.data || []).length,
        users: usersData.length,
      }
    }

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
