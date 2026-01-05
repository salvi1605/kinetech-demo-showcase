import { useNavigate } from 'react-router-dom';
import { Lock, Mail, LogOut, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const NoAccess = () => {
  const { state } = useApp();
  const navigate = useNavigate();

  const userEmail = state.currentUser?.email || '';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(userEmail);
      toast.success('Email copiado al portapapeles');
    } catch (error) {
      toast.error('Error al copiar el email');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Cuenta pendiente de asignación</CardTitle>
          <CardDescription className="text-base">
            Tu cuenta ya está registrada pero aún no tienes acceso a ninguna clínica. 
            Contacta al administrador de tu clínica para que te asigne acceso.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User Email */}
          {userEmail && (
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-sm font-normal px-3 py-1">
                {userEmail}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyEmail}
                title="Copiar email"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">¿Qué puedes hacer?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Comparte tu email con el administrador de la clínica</li>
              <li>Espera a que te asignen acceso desde el panel de usuarios</li>
              <li>Una vez asignado, vuelve a iniciar sesión</li>
            </ul>
          </div>

          {/* Sign Out Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
