import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.3.1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

// Manual appointment emails (info, reminder, upcoming list), triggered only by a
// staff member from the UI. Direct sendLovableEmail call (not the helper) so the
// clinic-branded From label is preserved.
const SITE_NAME = "agendixpro"
const SENDER_DOMAIN = "notify.agendixpro.app"
const FROM_DOMAIN = "agendixpro.app"

const ALLOWED_TEMPLATES = new Set(['appointment-info', 'appointment-reminder', 'upcoming-appointments'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return json({ error: 'Server configuration error' }, 500)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON in request body' }, 400)
  }

  const templateName: string = body?.templateName
  const recipientEmail: string = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : ''
  const templateData: Record<string, any> =
    body?.templateData && typeof body.templateData === 'object' ? body.templateData : {}
  const idempotencyKey: string =
    typeof body?.idempotencyKey === 'string' && body.idempotencyKey ? body.idempotencyKey.slice(0, 200) : crypto.randomUUID()
  let fromLabel: string | undefined
  if (typeof body?.fromLabel === 'string' && body.fromLabel.trim()) {
    fromLabel = body.fromLabel.trim().replace(/[\r\n<>"]/g, '').slice(0, 80)
  }

  if (!templateName || !ALLOWED_TEMPLATES.has(templateName) || !TEMPLATES[templateName]) {
    return json({ error: 'Invalid templateName' }, 400)
  }
  if (!EMAIL_RE.test(recipientEmail) || recipientEmail.length > 320) {
    return json({ error: 'Invalid recipientEmail' }, 400)
  }
  if (templateData.clinicWhatsappUrl !== undefined &&
      (typeof templateData.clinicWhatsappUrl !== 'string' ||
       !/^https:\/\/wa\.me\/\d{8,15}\?text=[^\s]*$/.test(templateData.clinicWhatsappUrl))) {
    return json({ error: 'Invalid clinicWhatsappUrl' }, 400)
  }

  const template = TEMPLATES[templateName]
  const recipient = template.to || recipientEmail
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const logRow = async (status: 'sent' | 'suppressed' | 'failed', error_message?: string) => {
    const { error } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipient,
      status,
      error_message: error_message ?? null,
    })
    if (error) console.error('Failed to write email_send_log', { code: error.code, message: error.message })
  }

  const element = React.createElement(template.component, templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  try {
    await sendLovableEmail(
      {
        to: recipient,
        from: `${fromLabel || SITE_NAME} <agenda@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: idempotencyKey,
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') }
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await logRow('suppressed')
      return json({ success: false, reason: 'email_suppressed' })
    }
    const msg = error instanceof Error ? error.message : String(error)
    await logRow('failed', msg.slice(0, 1000))
    console.error('Email send failed', { templateName, error: msg })
    const status = error instanceof EmailAPIError && error.status ? error.status : 500
    return json({ error: 'Failed to send email', details: msg }, status)
  }

  await logRow('sent')
  return json({ success: true })
})
