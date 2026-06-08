// Registry of transactional email templates.
// Add new templates by importing them and registering them in TEMPLATES.

import * as React from 'npm:react@18.3.1'
import { template as appointmentInfo } from './appointment-info.tsx'

export interface TemplateEntry {
  // React Email component used to render the email body.
  component: React.ComponentType<any>
  // Static subject string, or a function that derives the subject from templateData.
  subject: string | ((data: Record<string, any>) => string)
  // Optional human-readable name shown in tooling/logs.
  displayName?: string
  // Optional preview data used by preview tooling.
  previewData?: Record<string, any>
  // Optional fixed recipient (overrides caller-provided recipientEmail).
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'appointment-info': appointmentInfo,
}
