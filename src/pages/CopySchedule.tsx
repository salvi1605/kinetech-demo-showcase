import { Copy, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const CopySchedule = () => {
  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Copy className="h-6 w-6 text-primary" />
            Copiar Horarios
          </h1>
          <p className="text-muted-foreground">
            Duplica horarios entre profesionales o períodos de tiempo
          </p>
        </div>
      </div>

      <Card className="text-center p-8">
        <CardContent>
          <div className="flex items-center justify-center gap-4 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">Copia de Horarios</CardTitle>
          <CardDescription className="mb-4">
            Herramienta para duplicar configuraciones de horarios entre profesionales o semanas
          </CardDescription>
          <Button>
            <Copy className="h-4 w-4 mr-2" />
            Iniciar Copia
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};