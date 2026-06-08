/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AppointmentInfoProps {
  patientName?: string
  appointmentDate?: string
  appointmentTime?: string
  practitionerName?: string
  treatmentName?: string
  clinicName?: string
  clinicAddress?: string
  notes?: string
}

const AppointmentInfoEmail = ({
  patientName,
  appointmentDate,
  appointmentTime,
  practitionerName,
  treatmentName,
  clinicName,
  clinicAddress,
  notes,
}: AppointmentInfoProps) => {
  const greetingName = patientName?.trim() || 'Paciente'
  const clinic = clinicName?.trim() || 'AgendixPro'

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>
        {`Información de tu turno${appointmentDate ? ` para el ${appointmentDate}` : ''}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Información de tu turno</Heading>
          <Text style={text}>Hola {greetingName},</Text>
          <Text style={text}>
            Te enviamos los datos de tu próximo turno en <strong>{clinic}</strong>:
          </Text>

          <Section style={card}>
            {appointmentDate && (
              <Row label="Fecha" value={appointmentDate} />
            )}
            {appointmentTime && (
              <Row label="Hora" value={appointmentTime} />
            )}
            {practitionerName && (
              <Row label="Profesional" value={practitionerName} />
            )}
            {treatmentName && (
              <Row label="Tratamiento" value={treatmentName} />
            )}
            {clinicAddress && (
              <Row label="Dirección" value={clinicAddress} />
            )}
          </Section>

          {notes && (
            <>
              <Text style={label}>Notas</Text>
              <Text style={notesText}>{notes}</Text>
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Si no reconocés este turno o necesitás reprogramarlo, comunicate con
            la clínica.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const Row = ({ label: l, value }: { label: string; value: string }) => (
  <table style={rowTable}>
    <tbody>
      <tr>
        <td style={rowLabel}>{l}</td>
        <td style={rowValue}>{value}</td>
      </tr>
    </tbody>
  </table>
)

export const template = {
  component: AppointmentInfoEmail,
  subject: (data: Record<string, any>) =>
    data?.appointmentDate
      ? `Información de tu turno - ${data.appointmentDate}`
      : 'Información de tu turno',
  displayName: 'Información del turno',
  previewData: {
    patientName: 'María Pérez',
    appointmentDate: 'lunes 15 de junio de 2026',
    appointmentTime: '10:30',
    practitionerName: 'Lic. Juan Gómez',
    treatmentName: 'FKT',
    clinicName: 'AgendixPro Demo',
    clinicAddress: 'Av. Siempre Viva 123, Buenos Aires',
    notes: 'Por favor, llegá 10 minutos antes.',
  },
} satisfies TemplateEntry

export default AppointmentInfoEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const label = {
  fontSize: '12px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '20px 0 6px',
  fontWeight: '600' as const,
}
const notesText = {
  fontSize: '14px',
  color: '#0f172a',
  lineHeight: '1.6',
  margin: '0 0 8px',
  whiteSpace: 'pre-wrap' as const,
}
const card = {
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '16px 20px',
  margin: '8px 0 8px',
  backgroundColor: '#f8fafc',
}
const rowTable = { width: '100%', borderCollapse: 'collapse' as const, margin: '4px 0' }
const rowLabel = {
  fontSize: '13px',
  color: '#64748b',
  padding: '4px 8px 4px 0',
  width: '40%',
  verticalAlign: 'top' as const,
}
const rowValue = {
  fontSize: '14px',
  color: '#0f172a',
  padding: '4px 0',
  fontWeight: '500' as const,
}
const hr = { borderColor: '#e2e8f0', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0' }
