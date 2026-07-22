import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Send, Mail, Info, MapPin, Phone, User, Calendar, Clock, Stethoscope } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDate } from '@/utils/dateUtils';
import { formatPatientFullName, treatmentLabel } from '@/utils/formatters';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import type { Appointment, Patient } from '@/contexts/AppContext';

interface ClinicInfo {
  name: string | null;
  address: string | null;
  contact_phone: string | null;
  appointment_instructions: string | null;
}

interface LastSend {
  sent_at: string;
  recipient_email: string;
  user_full_name: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  patient: Patient | null;
  practitionerName?: string;
}

export const SendAppointmentInfoDialog = ({
  open,
  onOpenChange,
  appointment,
  patient,
  practitionerName,
}: Props) => {
  const { state } = useApp();
  const { toast } = useToast();
  const { settings: clinicSettings } = useClinicSettings();

  const [emailOverride, setEmailOverride] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [confirmResend, setConfirmResend] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [lastSend, setLastSend] = useState<LastSend | null>(null);
  const [loadingLast, setLoadingLast] = useState(false);

  const effectiveIsSuperAdmin = state.userRole === 'super_admin' && !state.isImpersonatingRole;
  const patientEmail = patient?.email?.trim() || '';
  // Consentimiento: si el paciente no autorizó email, bloqueamos el envío.
  // Default true cuando no hay dato para no romper flujos previos a la captura de consentimiento.
  const contactAuthEmail = patient?.seguro?.contactAuth?.email ?? true;

  // Cargar datos de clínica y último envío al abrir
  useEffect(() => {
    if (!open || !appointment || !state.currentClinicId) return;
    let mounted = true;

    (async () => {
      // Datos de la clínica
      const { data: cData } = await supabase
        .from('clinics')
        .select('name, address, contact_phone, appointment_instructions')
        .eq('id', state.currentClinicId)
        .maybeSingle();
      if (mounted && cData) setClinicInfo(cData as ClinicInfo);
    })();

    // Último envío (RPC minimal)
    setLoadingLast(true);
    supabase
      .rpc('get_last_appointment_email_send', { p_appointment_id: appointment.id })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.warn('No se pudo obtener último envío:', error);
          setLastSend(null);
        } else if (data && data.length > 0) {
          setLastSend(data[0] as LastSend);
        } else {
          setLastSend(null);
        }
        setLoadingLast(false);
      });

    // Reset UI state
    setEmailOverride('');
    setConfirmResend(false);

    return () => {
      mounted = false;
    };
  }, [open, appointment, state.currentClinicId]);

  if (!appointment) return null;

  const appointmentDate = parseLocalDate(appointment.date);
  const formattedDate = format(appointmentDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const startHHmm = (appointment.startTime || '').slice(0, 5);
  const treatmentName = appointment.treatmentType
    ? (treatmentLabel[appointment.treatmentType as keyof typeof treatmentLabel] || appointment.treatmentType)
    : undefined;

  const trimmedOverride = emailOverride.trim();
  const recipient = trimmedOverride || patientEmail;
  const hasOverride = trimmedOverride.length > 0 && trimmedOverride.toLowerCase() !== patientEmail.toLowerCase();

  const emailFormatValid = !!recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
  const needsResendConfirm = !!lastSend && !confirmResend;
  const blockedByConsent = !contactAuthEmail;

  const canSend =
    emailFormatValid &&
    !isSending &&
    !blockedByConsent &&
    !needsResendConfirm;

  const handleSend = async () => {
    if (!appointment || !emailFormatValid) return;
    if (blockedByConsent) return;

    setIsSending(true);
    try {
      const clinicNameForEmail = clinicInfo?.name || state.currentClinicName || 'AgendixPro';
      const fromLabel = `${clinicNameForEmail} | AgendixPro`;

      const { data, error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'appointment-info',
          recipientEmail: recipient,
          idempotencyKey: `appointment-info-${appointment.id}-${Date.now()}`,
          fromLabel,
          templateData: {
            patientName: patient ? formatPatientFullName(patient) : undefined,
            appointmentDate: formattedDate,
            appointmentTime: startHHmm,
            practitionerName: practitionerName,
            treatmentName,
            clinicName: clinicNameForEmail,
            clinicAddress: clinicInfo?.address || undefined,
            clinicPhone: clinicInfo?.contact_phone || undefined,
            appointmentInstructions: clinicInfo?.appointment_instructions || undefined,
            customMessage: clinicSettings?.email_custom_message || undefined,
            subjectOverride: clinicSettings?.email_subject_override || undefined,
            notes: appointment.notes || undefined,
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

      // Auditoría
      try {
        await supabase.rpc('log_appointment_email_sent', {
          p_appointment_id: appointment.id,
          p_recipient_email: recipient,
          p_template_name: 'appointment-info',
          p_was_test: hasOverride,
        });
      } catch (auditErr) {
        console.warn('Error registrando auditoría del envío:', auditErr);
      }

      toast({
        title: 'Información enviada',
        description: `Se envió el email a ${recipient}.`,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error('Error sending appointment info email:', err);
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
            Enviar información del turno
          </DialogTitle>
          <DialogDescription>
            Revisá los datos antes de enviar. Este es un envío manual único.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Advertencia si no dio consentimiento */}
          {blockedByConsent && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este paciente no autorizó recibir emails. No se puede enviar hasta
                que autorice el contacto por correo desde su ficha.
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso de reenvío */}
          {lastSend && !blockedByConsent && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                <p className="text-sm">
                  <strong>Ya se envió información de este turno</strong> el{' '}
                  {format(new Date(lastSend.sent_at), "d/MM/yyyy 'a las' HH:mm", { locale: es })}
                  {' '}a <span className="font-mono">{lastSend.recipient_email}</span>
                  {lastSend.user_full_name ? ` (por ${lastSend.user_full_name})` : ''}.
                </p>
                {!confirmResend && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => setConfirmResend(true)}
                  >
                    Confirmar que quiero reenviar
                  </Button>
                )}
                {confirmResend && (
                  <Badge variant="secondary" className="text-xs">Reenvío confirmado</Badge>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview del contenido */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Paciente</div>
                <div className="font-medium">
                  {patient ? formatPatientFullName(patient) : 'Sin paciente'}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Fecha</div>
                <div className="font-medium capitalize">{formattedDate}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Hora</div>
                <div className="font-medium">{startHHmm}</div>
              </div>
            </div>
            {practitionerName && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Profesional</div>
                  <div className="font-medium">{practitionerName}</div>
                </div>
              </div>
            )}
            {treatmentName && (
              <div className="flex items-start gap-2">
                <Stethoscope className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Tratamiento</div>
                  <div className="font-medium">{treatmentName}</div>
                </div>
              </div>
            )}
            {clinicInfo?.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Dirección</div>
                  <div className="font-medium">{clinicInfo.address}</div>
                </div>
              </div>
            )}
            {clinicInfo?.contact_phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Teléfono</div>
                  <div className="font-medium">{clinicInfo.contact_phone}</div>
                </div>
              </div>
            )}
            {clinicInfo?.appointment_instructions && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Instrucciones</div>
                <div className="text-sm whitespace-pre-wrap">{clinicInfo.appointment_instructions}</div>
              </div>
            )}
            {clinicSettings?.email_custom_message && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Mensaje de la clínica</div>
                <div className="text-sm whitespace-pre-wrap">{clinicSettings.email_custom_message}</div>
              </div>
            )}
          </div>

          {/* Email destinatario */}
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Email destinatario</Label>
            <Input
              id="recipient-email"
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
            {isSending ? 'Enviando…' : lastSend ? 'Reenviar información' : 'Enviar información'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
