import { Calendar, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Exceptions = () => {
  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Excepciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona días feriados, vacaciones y horarios especiales
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Excepción
        </Button>
      </div>

      <Card className="text-center p-8">
        <CardContent>
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="mb-2">Gestión de Excepciones</CardTitle>
          <CardDescription className="mb-4">
            Configura días especiales, feriados y horarios excepcionales para los profesionales
          </CardDescription>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Excepción
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};