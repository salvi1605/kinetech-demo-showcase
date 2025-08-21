import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, Clock, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';

const mockClinics = [
  {
    id: 'clinic-1',
    name: 'Centro de Kinesiología Norte',
    address: 'Av. Libertador 1234, CABA',
    phone: '+54 11 1234-5678',
    practitioners: 8,
    openHours: '08:00 - 20:00',
    status: 'active' as const,
  },
  {
    id: 'clinic-2',
    name: 'Fisioterapia & Rehabilitación Sur',
    address: 'Av. Corrientes 5678, CABA',
    phone: '+54 11 8765-4321',
    practitioners: 12,
    openHours: '07:00 - 22:00',
    status: 'active' as const,
  },
  {
    id: 'clinic-3',
    name: 'Centro Integral de Salud',
    address: 'Av. Santa Fe 9012, CABA',
    phone: '+54 11 5555-9999',
    practitioners: 15,
    openHours: '06:00 - 23:00',
    status: 'active' as const,
  },
];

export const SelectClinic = () => {
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const handleSelectClinic = (clinicId: string) => {
    setSelectedClinic(clinicId);
    dispatch({ type: 'SET_SELECTED_CLINIC', payload: clinicId });
    
    const clinic = mockClinics.find(c => c.id === clinicId);
    toast({
      title: "Clínica seleccionada",
      description: `Accediendo a ${clinic?.name}`,
    });

    // Navigate to calendar after selection
    setTimeout(() => {
      navigate('/calendar');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Seleccionar Clínica</h1>
          <p className="text-muted-foreground">
            Elige la clínica desde la cual deseas trabajar
          </p>
          {state.currentUser && (
            <Badge variant="outline" className="mt-2">
              {state.currentUser.name} - {state.userRole === 'admin' ? 'Administrador' : 
               state.userRole === 'recep' ? 'Recepcionista' : 'Kinesiólogo'}
            </Badge>
          )}
        </div>

        {/* Clinics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockClinics.map((clinic) => (
            <Card 
              key={clinic.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedClinic === clinic.id 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleSelectClinic(clinic.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    <Badge variant="secondary" className="text-xs">
                      {clinic.status === 'active' ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  {selectedClinic === clinic.id && (
                    <ArrowRight className="h-5 w-5 text-primary animate-pulse" />
                  )}
                </div>
                <CardTitle className="text-lg">{clinic.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {clinic.address}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Horario: {clinic.openHours}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{clinic.practitioners} profesionales</span>
                </div>

                <div className="pt-2">
                  <Button 
                    variant={selectedClinic === clinic.id ? "default" : "outline"}
                    className="w-full"
                    disabled={selectedClinic === clinic.id}
                  >
                    {selectedClinic === clinic.id ? 'Seleccionada' : 'Seleccionar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Demo Notice */}
        {state.isDemoMode && (
          <Card className="bg-info/10 border-info/20">
            <CardContent className="pt-4">
              <p className="text-sm text-center text-info-foreground">
                <strong>Modo Demo:</strong> Las clínicas mostradas son datos de ejemplo.
                La selección no afecta la funcionalidad del sistema.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back to Login */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Volver al Login
          </Button>
        </div>
      </div>
    </div>
  );
};