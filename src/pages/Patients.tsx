import { useState } from 'react';
import { Users, Plus, Search, Filter, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

export const Patients = () => {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');

  const filteredPatients = state.patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterCondition === 'all' || 
                         patient.conditions.some(condition => 
                           condition.toLowerCase().includes(filterCondition.toLowerCase())
                         );
    
    return matchesSearch && matchesFilter;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Pacientes
          </h1>
          <p className="text-muted-foreground">
            Gestiona la información de los pacientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Paciente
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(patient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{patient.name}</CardTitle>
                    <CardDescription>
                      {calculateAge(patient.birthDate)} años
                    </CardDescription>
                  </div>
                </div>
                <Link to={`/patients/${patient.id}`}>
                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{patient.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{patient.phone}</span>
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Condiciones:</p>
                <div className="flex flex-wrap gap-1">
                  {patient.conditions.map((condition, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Last Visit / Next Appointment */}
              <div className="space-y-2 text-sm">
                {patient.lastVisit && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Última visita: {new Date(patient.lastVisit).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
                {patient.nextAppointment && (
                  <div className="flex items-center gap-2 text-accent">
                    <Calendar className="h-4 w-4" />
                    <span>Próxima cita: {new Date(patient.nextAppointment).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Link to={`/patients/${patient.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Detalles
                  </Button>
                </Link>
                <Button variant="default" size="sm" className="flex-1">
                  Nueva Cita
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredPatients.length === 0 && searchTerm && (
        <Card className="text-center p-8">
          <CardContent>
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No se encontraron pacientes</CardTitle>
            <CardDescription>
              No hay pacientes que coincidan con tu búsqueda "{searchTerm}"
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!state.isDemoMode && state.patients.length === 0 && (
        <Card className="text-center p-8">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No hay pacientes registrados</CardTitle>
            <CardDescription className="mb-4">
              Comienza agregando el primer paciente o activa el modo demo
            </CardDescription>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Paciente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{state.patients.length}</p>
            <p className="text-sm text-muted-foreground">Total Pacientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">
              {state.patients.filter(p => p.nextAppointment).length}
            </p>
            <p className="text-sm text-muted-foreground">Con Citas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {state.patients.filter(p => p.lastVisit).length}
            </p>
            <p className="text-sm text-muted-foreground">Visitados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-info">
              {new Set(state.patients.flatMap(p => p.conditions)).size}
            </p>
            <p className="text-sm text-muted-foreground">Condiciones</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};