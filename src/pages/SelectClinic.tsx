import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, Clock, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type ClinicWithRole = {
  id: string;
  name: string;
  country_code: string | null;
  timezone: string;
  is_active: boolean | null;
  role_id: string;
  role_description: string | null;
};

export const SelectClinic = () => {
  const [clinics, setClinics] = useState<ClinicWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  // Load user's clinics
  React.useEffect(() => {
    const loadClinics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login', { replace: true });
          return;
        }

        // Get user_id from public.users
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) {
          toast({
            title: "Error",
            description: "No se encontró el usuario en el sistema",
            variant: "destructive",
          });
          return;
        }

        // Get user's clinics with roles
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            clinic_id,
            role_id,
            clinics:clinic_id (
              id,
              name,
              country_code,
              timezone,
              is_active
            ),
            roles:role_id (
              description
            )
          `)
          .eq('user_id', userData.id)
          .eq('active', true);

        if (rolesError) {
          console.error('Error loading clinics:', rolesError);
          toast({
            title: "Error",
            description: "Error al cargar las clínicas",
            variant: "destructive",
          });
          return;
        }

        const clinicsWithRoles: ClinicWithRole[] = (userRoles || []).map((ur: any) => ({
          id: ur.clinics.id,
          name: ur.clinics.name,
          country_code: ur.clinics.country_code,
          timezone: ur.clinics.timezone,
          is_active: ur.clinics.is_active,
          role_id: ur.role_id,
          role_description: ur.roles?.description || ur.role_id,
        }));

        setClinics(clinicsWithRoles);
      } catch (error) {
        console.error('Error loading clinics:', error);
        toast({
          title: "Error",
          description: "Error al cargar las clínicas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadClinics();
  }, [navigate]);

  const handleSelectClinic = (clinicId: string, clinicName: string, roleId: string) => {
    setSelectedClinic(clinicId);
    
    // Map database role to app role
    let appRole: 'admin' | 'recep' | 'kinesio' = 'kinesio';
    if (roleId === 'admin_clinic' || roleId === 'tenant_owner') {
      appRole = 'admin';
    } else if (roleId === 'receptionist') {
      appRole = 'recep';
    } else if (roleId === 'health_pro') {
      appRole = 'kinesio';
    }

    dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: clinicId, name: clinicName } });
    dispatch({ type: 'SET_USER_ROLE', payload: appRole });
    
    toast({
      title: "Clínica seleccionada",
      description: `Accediendo a ${clinicName}`,
    });

    setTimeout(() => {
      navigate('/calendar', { replace: true });
    }, 800);
  };

  const getRoleDisplayName = (roleId: string) => {
    switch (roleId) {
      case 'tenant_owner': return 'Propietario';
      case 'admin_clinic': return 'Administrador';
      case 'receptionist': return 'Recepcionista';
      case 'health_pro': return 'Kinesiólogo';
      default: return roleId;
    }
  };

  const getRoleBadgeVariant = (roleId: string) => {
    switch (roleId) {
      case 'tenant_owner':
      case 'admin_clinic':
        return 'destructive';
      case 'receptionist':
        return 'secondary';
      case 'health_pro':
        return 'default';
      default:
        return 'outline';
    }
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
              {state.currentUser.name}
            </Badge>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando clínicas...</p>
          </div>
        )}

        {/* No Clinics */}
        {!isLoading && clinics.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Building className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No tienes clínicas asignadas</h3>
                <p className="text-sm text-muted-foreground">
                  {state.canCreateClinic 
                    ? 'Puedes crear una nueva clínica para comenzar'
                    : 'Contacta al administrador para obtener acceso'}
                </p>
              </div>
              {state.canCreateClinic && !state.hasRolesPending && (
                <Button onClick={() => navigate('/create-clinic')}>
                  Crear Mi Clínica
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Clinics Grid */}
        {!isLoading && clinics.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinics.map((clinic) => (
              <Card 
                key={clinic.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedClinic === clinic.id 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleSelectClinic(clinic.id, clinic.name, clinic.role_id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      <Badge variant={clinic.is_active ? "secondary" : "outline"} className="text-xs">
                        {clinic.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    {selectedClinic === clinic.id && (
                      <ArrowRight className="h-5 w-5 text-primary animate-pulse" />
                    )}
                  </div>
                  <CardTitle className="text-lg">{clinic.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {clinic.country_code || 'Sin país'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{clinic.timezone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <Badge variant={getRoleBadgeVariant(clinic.role_id) as any} className="text-xs">
                      {getRoleDisplayName(clinic.role_id)}
                    </Badge>
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
        )}

        {/* Back to Login */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
};