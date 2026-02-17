import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar que el usuario autenticado sea admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el usuario sea admin
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userRecord) {
      return new Response(
        JSON.stringify({ error: 'User record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userRecord.id)
      .eq('active', true)

    const isAdmin = userRoles?.some(ur => ur.role_id === 'admin_clinic' || ur.role_id === 'tenant_owner')
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins or tenant owners can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener datos del request
    const { email, password, fullName, roleId, clinicId } = await req.json()

    // Validate password minimum length
    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating/adding user: ${email} with role ${roleId} for clinic ${clinicId}`)

    let authUserId: string | null = null
    let userId: string

    // Check if user already exists in public.users by email
    const { data: existingPublicUser } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id')
      .eq('email', email)
      .maybeSingle()

    if (existingPublicUser) {
      // User already exists in public.users
      userId = existingPublicUser.id
      authUserId = existingPublicUser.auth_user_id

      console.log(`Found existing public user: ${userId}`)

      // Check if user already has a role in this clinic
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('clinic_id', clinicId)
        .maybeSingle()

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: 'Este usuario ya tiene acceso a esta clínica' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If user exists but doesn't have auth_user_id, try to create auth user
      if (!authUserId) {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })

        if (authError) {
          // Check if it's because user already exists in auth
          if (authError.message.includes('already been registered')) {
            // Get auth user by email
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
            const existingAuthUser = authUsers?.users?.find(u => u.email === email)
            if (existingAuthUser) {
              authUserId = existingAuthUser.id
              // Update public.users with auth_user_id
              await supabaseAdmin
                .from('users')
                .update({ auth_user_id: authUserId })
                .eq('id', userId)
            }
          } else {
            throw authError
          }
        } else {
          authUserId = authData.user.id
          // Update public.users with auth_user_id
          await supabaseAdmin
            .from('users')
            .update({ 
              auth_user_id: authUserId,
              full_name: fullName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
        }
      }
    } else {
      // User doesn't exist, create new
      // First try to create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError) {
        // If user already exists in auth but not in public.users
        if (authError.message.includes('already been registered')) {
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
          const existingAuthUser = authUsers?.users?.find(u => u.email === email)
          if (existingAuthUser) {
            authUserId = existingAuthUser.id
          } else {
            return new Response(
              JSON.stringify({ error: authError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          return new Response(
            JSON.stringify({ error: authError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        authUserId = authData.user.id
      }

      // Create public.users record
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email,
          full_name: fullName,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error creating public.users record:', insertError)
        throw insertError
      }
      userId = newUser.id
    }

    // Asignar rol para esta clínica
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        clinic_id: clinicId,
        active: true,
      })

    if (roleError) {
      console.error('Error assigning role:', roleError)
      throw roleError
    }

    console.log(`Successfully created/added user ${email} with role ${roleId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userId,
          email,
          full_name: fullName,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
