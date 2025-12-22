import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Plus, Search, Phone, Mail, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { usePractitioners, type PractitionerWithStatus } from '@/hooks/usePractitioners';
import { NewProfessionalDialog } from '@/components/dialogs/NewProfessionalDialog';
import { EditProfessionalDialog } from '@/components/dialogs/EditProfessionalDialog';
import type { Practitioner } from '@/contexts/AppContext';

export const Practitioners = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [showInactive, setShowInactive] = useState(false);
  const { practitioners, loading } = usePractitioners(state.currentClinicId, showInactive);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewProfessional, setShowNewProfessional] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Practitioner | null>(null);

  const handleViewAgenda = (practitionerId: string) => {
    dispatch({ type: 'SET_FILTER_PRACTITIONER', payload: practitionerId });
    navigate('/calendar');
  };

  const filteredPractitioners = practitioners.filter(practitioner =>
    practitioner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    practitioner.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    practitioner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="text-sm text-muted-foreground cursor-pointer">
              Mostrar inactivos
            </Label>
          </div>
          <Button onClick={() => setShowNewProfessional(true)}>
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

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Practitioners Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPractitioners.map((practitioner: PractitionerWithStatus) => (
          <Card 
            key={practitioner.id} 
            className={`hover:shadow-md transition-shadow ${!practitioner.isActive ? 'opacity-60 border-dashed' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className={`h-12 w-12 ${!practitioner.isActive ? 'grayscale' : ''}`}>
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {getInitials(practitioner.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg truncate">{practitioner.name}</CardTitle>
                    {!practitioner.isActive && (
                      <Badge variant="secondary" className="shrink-0 bg-muted text-muted-foreground">
                        <UserX className="h-3 w-3 mr-1" />
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{practitioner.specialty}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{practitioner.email || 'Sin email'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{practitioner.phone || 'Sin teléfono'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleViewAgenda(practitioner.id)}
                  disabled={!practitioner.isActive}
                >
                  Ver Agenda
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1" 
                  onClick={() => setEditingProfessional(practitioner)}
                >
                  {practitioner.isActive ? 'Editar' : 'Reactivar'}
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && filteredPractitioners.length === 0 && searchTerm && (
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
      {!loading && practitioners.length === 0 && !searchTerm && (
        <Card className="text-center p-8">
          <CardContent>
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">
              {showInactive ? 'No hay profesionales' : 'No hay profesionales activos'}
            </CardTitle>
            <CardDescription className="mb-4">
              {showInactive 
                ? 'Comienza agregando el primer profesional'
                : 'Activa el toggle "Mostrar inactivos" o agrega un nuevo profesional'
              }
            </CardDescription>
            <Button onClick={() => setShowNewProfessional(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Profesional
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {showNewProfessional && <NewProfessionalDialog onClose={() => setShowNewProfessional(false)} />}
      {editingProfessional && <EditProfessionalDialog professional={editingProfessional} onClose={() => setEditingProfessional(null)} />}
    </div>
  );
};