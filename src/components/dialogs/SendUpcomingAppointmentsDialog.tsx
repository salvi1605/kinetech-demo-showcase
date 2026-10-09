import { useState, useEffect } from 'react';
import { AlertCircle, Send, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPatientFullName } from '@/utils/formatters';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import type { Patient } from '@/contexts/AppContext';

export interface UpcomingAppointmentEmailItem {
  id?: string;
  date: string;
  time: string;
  practitionerName?: string;
  treatmentName?: string;
}

interface ClinicInfo {
  name: string | null;
  address: string | null;
  contact_phone: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  appointments: UpcomingAppointmentEmailItem[];
}

export const SendUpcomingAppointmentsDialog = ({ open, onOpenChange, patient, appointments }: Props) => {
  const { state } = useApp();
  const { toast } = useToast();
  const { settings: clinicSettings } = useClinicSettings();

  const [emailOverride, setEmailOverride] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);

  const effectiveIsSuperAdmin = state.userRole === 'super_admin' && !state.isImpersonatingRole;
  const patientEmail = patient?.email?.trim() || '';
  const contactAuthEmail = patient?.seguro?.contactAuth?.email ?? true;

  useEffect(() => {
    if (!open || !state.currentClinicId) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('clinics')
        .select('name, address, contact_phone')
        .eq('id', state.currentClinicId)
        .maybeSingle();
      if (mounted && data) setClinicInfo(data as ClinicInfo);
    })();
    setEmailOverride('');
    return () => {
      mounted = false;
    };
  }, [open, state.currentClinicId]);

  const trimmedOverride = emailOverride.trim();
  const recipient = trimmedOverride || patientEmail;
  const hasOverride = trimmedOverride.length > 0 && trimmedOverride.toLowerCase() !== patientEmail.toLowerCase();
  const emailFormatValid = !!recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
  const blockedByConsent = !contactAuthEmail;
  const canSend = emailFormatValid && !isSending && !blockedByConsent && appointments.length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      const clinicName = clinicInfo?.name || state.currentClinicName || 'AgendixPro';
      const { data, error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'upcoming-appointments',
          recipientEmail: recipient,
          idempotencyKey: `upcoming-appointments-${patient?.id || 'na'}-${Date.now()}`,
          fromLabel: `${clinicName} | AgendixPro`,
          templateData: {
            patientName: patient ? formatPatientFullName(patient) : undefined,
            clinicName,
            clinicAddress: clinicInfo?.address || undefined,
            clinicPhone: clinicInfo?.contact_phone || undefined,
            appointments: appointments.map(({ date, time, practitionerName, treatmentName }) => ({
              date,
              time,
              practitionerName,
              treatmentName,
            })),
            customMessage: clinicSettings?.email_custom_message || undefined,
            subjectOverride: clinicSettings?.email_subject_override || undefined,
          },
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.success === false && (data as any)?.reason === 'email_suppressed') {
        toast({
          title: 'Correo bloqueado',
          description: 'Esta dirección está en la lista de bajas y no recibe correos.',
          variant: 'destructive',
        });
        return;
      }

      for (const a of appointments) {
        if (!a.id) continue;
        try {
          await supabase.rpc('log_appointment_email_sent', {
            p_appointment_id: a.id,
            p_recipient_email: recipient,
            p_template_name: 'upcoming-appointments',
            p_was_test: hasOverride,
          });
        } catch (auditErr) {
          console.warn('Error registrando auditoría del envío:', auditErr);
        }
      }

      toast({ title: 'Próximos turnos enviados', description: `Se envió el email a ${recipient}.` });
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error sending upcoming appointments email:', err);
      toast({
        title: 'Error al enviar',
        description: err?.message || 'No se pudo enviar el correo.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar próximos turnos
          </DialogTitle>
          <DialogDescription>
            Revisá los datos antes de enviar. Este es un envío manual único.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {blockedByConsent && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este paciente no autorizó recibir emails. No se puede enviar hasta
                que autorice el contacto por correo desde su ficha.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="text-xs text-muted-foreground">Paciente</div>
            <div className="font-medium">{patient ? formatPatientFullName(patient) : 'Sin paciente'}</div>
            <div className="text-xs text-muted-foreground pt-2">
              {appointments.length} {appointments.length === 1 ? 'turno' : 'turnos'}
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay turnos futuros para enviar.</p>
            ) : (
              <ul className="space-y-1">
                {appointments.map((a, i) => (
                  <li key={a.id || i} className="capitalize-first">
                    {[a.date, a.time, a.practitionerName, a.treatmentName].filter(Boolean).join(' • ')}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="upcoming-recipient-email">Email destinatario</Label>
            <Input
              id="upcoming-recipient-email"
              type="email"
              placeholder={patientEmail || 'correo@ejemplo.com'}
              value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
              autoComplete="off"
              disabled={blockedByConsent}
            />
            {!emailOverride && patientEmail && (
              <p className="text-xs text-muted-foreground">
                Se enviará al email registrado del paciente: <span className="font-mono">{patientEmail}</span>
              </p>
            )}
            {!emailOverride && !patientEmail && !blockedByConsent && (
              <p className="text-xs text-destructive">
                El paciente no tiene email registrado. Ingresá uno para este envío.
              </p>
            )}
            {hasOverride && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                ⚠️ Este email se usa <strong>solo para este envío</strong>. No actualiza la ficha del paciente.
              </p>
            )}
            {effectiveIsSuperAdmin && (
              <p className="text-[11px] text-muted-foreground">
                (Como super admin, podés enviar a un correo de prueba sin afectar al paciente.)
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Enviando…' : 'Enviar próximos turnos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
