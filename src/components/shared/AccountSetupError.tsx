import { useState } from 'react';
import { UserX } from 'lucide-react';
import { SeoHead } from '@/components/shared/SeoHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shown when the signed-in user's profile could not be prepared after login.
 * The session is intentionally kept open: the user chooses to retry or to sign out.
 */
export const AccountSetupError = () => {
  const [signingOut, setSigningOut] = useState(false);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.replace('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SeoHead
        title="No pudimos preparar tu cuenta — AgendixPro"
        description="Tu sesión sigue abierta. Vuelve a intentarlo en unos segundos."
        path="/login"
      />
      <Card className="w-full max-w-md text-center shadow-lg" role="alert" aria-live="assertive">
        <CardHeader className="pb-2 flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <UserX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">No pudimos preparar tu cuenta</CardTitle>
          <CardDescription className="text-base">
            Tu sesión sigue abierta. Puede ser una interrupción momentánea: vuelve a intentarlo en unos segundos.
            Si el problema continúa, avísale al administrador de tu clínica.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col gap-2">
          <Button className="w-full" size="lg" onClick={handleRetry} disabled={signingOut}>
            Reintentar
          </Button>
          <Button variant="outline" className="w-full" size="lg" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
