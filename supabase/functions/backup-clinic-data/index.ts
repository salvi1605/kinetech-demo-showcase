import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { buildClinicExport } from '../_shared/buildClinicExport.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  try {
    // 1. Validate server-to-server auth via BACKUP_SECRET
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const expectedSecret = Deno.env.get('BACKUP_SECRET')

    if (!expectedSecret || token !== expectedSecret) {
      console.error('Backup auth failed: invalid or missing BACKUP_SECRET')
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. Init admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Get all active clinics
    const { data: clinics, error: clinicsError } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('is_active', true)

    if (clinicsError || !clinics) {
      console.error('Failed to fetch clinics:', clinicsError?.message)
      return new Response(JSON.stringify({ error: 'Error al obtener clínicas' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    // 4. Iterate clinics, backup each one
    const now = new Date()
    const yyyy = now.getUTCFullYear()
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(now.getUTCDate()).padStart(2, '0')
    const timestamp = now.toISOString().replace(/[:.]/g, '-')

    const details: Array<{
      clinic_id: string;
      clinic_name: string;
      success: boolean;
      path?: string;
      error?: string;
    }> = []

    for (const clinic of clinics) {
      try {
        const exportData = await buildClinicExport(supabaseAdmin, clinic.id, 'automated_backup')

        const filePath = `${clinic.id}/${yyyy}/${mm}/${dd}/backup-${timestamp}.json`
        const fileContent = JSON.stringify(exportData)
        const blob = new Blob([fileContent], { type: 'application/json' })

        const { error: uploadError } = await supabaseAdmin.storage
          .from('clinic-backups')
          .upload(filePath, blob, {
            contentType: 'application/json',
            upsert: false,
          })

        if (uploadError) {
          console.error(`Upload failed for clinic ${clinic.id}:`, uploadError.message)
          details.push({
            clinic_id: clinic.id,
            clinic_name: clinic.name,
            success: false,
            error: uploadError.message,
          })
        } else {
          details.push({
            clinic_id: clinic.id,
            clinic_name: clinic.name,
            success: true,
            path: filePath,
          })
        }
      } catch (err) {
        console.error(`Backup failed for clinic ${clinic.id}:`, err?.message || err)
        details.push({
          clinic_id: clinic.id,
          clinic_name: clinic.name,
          success: false,
          error: err?.message || 'Unknown error',
        })
      }
    }

    const succeeded = details.filter(d => d.success).length
    const failed = details.filter(d => !d.success).length

    console.log(`Backup complete: ${succeeded} succeeded, ${failed} failed out of ${clinics.length}`)

    return new Response(JSON.stringify({
      processed: clinics.length,
      succeeded,
      failed,
      details,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Backup error:', error?.message || error)
    return new Response(JSON.stringify({ error: 'Error interno en backup' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
