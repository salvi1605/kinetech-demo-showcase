import { useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const messages: Record<string, { icon: typeof Clock; title: string; description: string }> = {
  inactivity: {
    icon: Clock,
    title: 'Sesión cerrada por inactividad',
    description:
      'No detectamos actividad durante 60 minutos. Por tu seguridad, cerramos la sesión automáticamente.',
  },
  expired: {
    icon: ShieldAlert,
    title: 'Tu sesión ha expirado',
    description:
      'Tu sesión dejó de ser válida. Esto puede ocurrir si pasó mucho tiempo o si iniciaste sesión en otro dispositivo.',
  },
};

const fallback = messages.expired;

const SessionExpired = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reason = params.get('reason') ?? 'expired';
  const { icon: Icon, title, description } = messages[reason] ?? fallback;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="pb-2 flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button className="w-full" size="lg" onClick={() => navigate('/login', { replace: true })}>
            Iniciar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionExpired;
