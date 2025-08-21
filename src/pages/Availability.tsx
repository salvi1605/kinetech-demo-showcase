import { Clock, Calendar, Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Availability = () => {
  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Disponibilidad
          </h1>
          <p className="text-muted-foreground">
            Gestiona los horarios de disponibilidad de los profesionales
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Configurar Horario
        </Button>
      </div>

      <Card className="text-center p-8">
        <CardContent>
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="mb-2">Gestión de Disponibilidad</CardTitle>
          <CardDescription className="mb-4">
            Esta sección permite configurar los horarios de disponibilidad de cada profesional
          </CardDescription>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Configurar Horarios
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};