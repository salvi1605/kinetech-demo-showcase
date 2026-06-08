import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, MailX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type ViewState =
  | { kind: 'loading' }
  | { kind: 'confirm'; email?: string }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Cancelar suscripción · AgendixPro';
  }, []);

  useEffect(() => {
    if (!token) {
      setView({ kind: 'invalid' });
      return;
    }

    let aborted = false;
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (aborted) return;

        if (res.status === 404 || data?.error) {
          setView({ kind: 'invalid' });
          return;
        }
        if (data?.valid === false && data?.reason === 'already_unsubscribed') {
          setView({ kind: 'already' });
          return;
        }
        setView({ kind: 'confirm', email: data?.email });
      } catch {
        if (!aborted) setView({ kind: 'error', message: 'No se pudo validar el enlace.' });
      }
    })();

    return () => {
      aborted = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setView({ kind: 'success' });
    } catch (e: any) {
      setView({ kind: 'error', message: e?.message || 'No se pudo procesar la solicitud.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <MailX className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Cancelar suscripción a correos</CardTitle>
          <CardDescription>AgendixPro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {view.kind === 'loading' && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Validando enlace…</p>
            </div>
          )}

          {view.kind === 'confirm' && (
            <>
              <p className="text-sm text-muted-foreground">
                Si confirmás, no recibirás más correos de AgendixPro
                {view.email ? ` en ${view.email}` : ''}.
              </p>
              <Button onClick={handleConfirm} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar cancelación
              </Button>
            </>
          )}

          {view.kind === 'already' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm">Ya estabas dado de baja. No recibirás más correos.</p>
            </div>
          )}

          {view.kind === 'success' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm">Listo. Cancelaste la suscripción correctamente.</p>
            </div>
          )}

          {view.kind === 'invalid' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm">Este enlace no es válido o ya expiró.</p>
            </div>
          )}

          {view.kind === 'error' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm">{view.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
