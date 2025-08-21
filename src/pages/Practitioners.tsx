import { useState } from 'react';
import { UserCheck, Plus, Search, Phone, Mail, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useApp } from '@/contexts/AppContext';

export const Practitioners = () => {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPractitioners = state.practitioners.filter(practitioner => 
    practitioner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    practitioner.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    practitioner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getWorkingDays = (schedule: any[]) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return schedule.map(s => days[s.dayOfWeek]).join(', ');
  };

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Profesionales
          </h1>
          <p className="text-muted-foreground">
            Gestiona el equipo de profesionales de la clínica
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Profesional
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, especialidad o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Practitioners Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPractitioners.map((practitioner) => (
          <Card key={practitioner.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {getInitials(practitioner.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{practitioner.name}</CardTitle>
                  <CardDescription>{practitioner.specialty}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{practitioner.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{practitioner.phone}</span>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Horarios de trabajo:
                </p>
                <Badge variant="outline" className="text-xs">
                  {getWorkingDays(practitioner.schedule)}
                </Badge>
                
                <div className="space-y-1">
                  {practitioner.schedule.map((sched, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{sched.startTime} - {sched.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2">
                <Badge variant="secondary">
                  Activo
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Ver Agenda
                  </Button>
                  <Button variant="default" size="sm">
                    Editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredPractitioners.length === 0 && searchTerm && (
        <Card className="text-center p-8">
          <CardContent>
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No se encontraron profesionales</CardTitle>
            <CardDescription>
              No hay profesionales que coincidan con tu búsqueda "{searchTerm}"
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!state.isDemoMode && state.practitioners.length === 0 && (
        <Card className="text-center p-8">
          <CardContent>
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No hay profesionales registrados</CardTitle>
            <CardDescription className="mb-4">
              Comienza agregando el primer profesional o activa el modo demo
            </CardDescription>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Profesional
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};