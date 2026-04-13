import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, Clock, Users, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreateClinicDialog } from '@/components/clinics/CreateClinicDialog';

type ClinicWithRole = {
  id: string;
  name: string;
  country_code: string | null;
  timezone: string;
  is_active: boolean | null;
  role_id: string;
  role_description: string | null;
};

type GroupedClinic = {
  id: string;
  name: string;
  country_code: string | null;
  timezone: string;
  is_active: boolean | null;
  roles: { role_id: string; role_description: string | null }[];
};

export const SelectClinic = () => {
  const [clinics, setClinics] = useState<ClinicWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  // Group clinics by clinic_id
  const groupedClinics = useMemo<GroupedClinic[]>(() => {
    const map = new Map<string, GroupedClinic>();
    clinics.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, {
          id: c.id,
          name: c.name,
          country_code: c.country_code,
          timezone: c.timezone,
          is_active: c.is_active,
          roles: [],
        });
      }
      const group = map.get(c.id)!;
      if (!group.roles.some(r => r.role_id === c.role_id)) {
        group.roles.push({ role_id: c.role_id, role_description: c.role_description });
      }
    });
    return Array.from(map.values());
  }, [clinics]);

  // Load user's clinics
  React.useEffect(() => {
    const loadClinics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login', { replace: true });
          return;
        }

        // Super admin: load ALL clinics + specific roles
        if (state.isSuperAdmin) {
          // Fetch all clinics
          const { data: allClinics, error: clinicsError } = await supabase
            .from('clinics')
            .select('id, name, country_code, timezone, is_active')
            .order('name');

          if (clinicsError) {
            console.error('Error loading clinics:', clinicsError);
            toast({ title: "Error", description: "Error al cargar las clínicas", variant: "destructive" });
            return;
          }

          // Also fetch the super admin's specific user_roles
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();

          let specificRoles: { clinic_id: string; role_id: string; role_description: string | null }[] = [];
          if (userData) {
            const { data: userRoles } = await supabase
              .from('user_roles')
              .select(`clinic_id, role_id, roles:role_id (description)`)
              .eq('user_id', userData.id)
              .eq('active', true)
              .not('clinic_id', 'is', null)
              .neq('role_id', 'super_admin');

            specificRoles = (userRoles || []).map((ur: any) => ({
              clinic_id: ur.clinic_id,
              role_id: ur.role_id,
              role_description: ur.roles?.description || ur.role_id,
            }));
          }

          const clinicsWithRoles: ClinicWithRole[] = [];
          (allClinics || []).forEach(c => {
            // Always add super_admin role
            clinicsWithRoles.push({
              id: c.id, name: c.name, country_code: c.country_code, timezone: c.timezone,
              is_active: c.is_active, role_id: 'super_admin', role_description: 'Super Admin',
            });
            // Add specific roles for this clinic
            specificRoles
              .filter(r => r.clinic_id === c.id)
              .forEach(r => {
                clinicsWithRoles.push({
                  id: c.id, name: c.name, country_code: c.country_code, timezone: c.timezone,
                  is_active: c.is_active, role_id: r.role_id, role_description: r.role_description,
                });
              });
          });

          setClinics(clinicsWithRoles);
          setIsLoading(false);
          return;
        }

        // Regular user: load clinics by role
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) {
          toast({ title: "Error", description: "No se encontró el usuario en el sistema", variant: "destructive" });
          return;
        }

        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            clinic_id,
            role_id,
            clinics:clinic_id (id, name, country_code, timezone, is_active),
            roles:role_id (description)
          `)
          .eq('user_id', userData.id)
          .eq('active', true)
          .not('clinic_id', 'is', null);

        if (rolesError) {
          console.error('Error loading clinics:', rolesError);
          toast({ title: "Error", description: "Error al cargar las clínicas", variant: "destructive" });
          return;
        }

        const clinicsWithRoles: ClinicWithRole[] = (userRoles || []).map((ur: any) => ({
          id: ur.clinics.id, name: ur.clinics.name, country_code: ur.clinics.country_code,
          timezone: ur.clinics.timezone, is_active: ur.clinics.is_active,
          role_id: ur.role_id, role_description: ur.roles?.description || ur.role_id,
        }));

        setClinics(clinicsWithRoles);
      } catch (error) {
        console.error('Error loading clinics:', error);
        toast({ title: "Error", description: "Error al cargar las clínicas", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    loadClinics();
  }, [navigate, state.isSuperAdmin]);

  const handleSelectClinic = (clinicId: string, clinicName: string, roleId: string) => {
    setSelectedClinic(clinicId);
    
    let appRole: 'admin_clinic' | 'receptionist' | 'health_pro' | 'tenant_owner' | 'super_admin' = 'health_pro';
    if (roleId === 'super_admin') {
      appRole = 'super_admin';
    } else if (roleId === 'admin_clinic') {
      appRole = 'admin_clinic';
    } else if (roleId === 'tenant_owner') {
      appRole = 'tenant_owner';
    } else if (roleId === 'receptionist') {
      appRole = 'receptionist';
    } else if (roleId === 'health_pro') {
      appRole = 'health_pro';
    }

    dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: clinicId, name: clinicName } });
    dispatch({ type: 'SET_USER_ROLE', payload: appRole });
    
    toast({
      title: "Clínica seleccionada",
      description: `Accediendo a ${clinicName} como ${getRoleDisplayName(roleId)}`,
    });

    setTimeout(() => {
      navigate('/calendar', { replace: true });
    }, 800);
  };

  const getRoleDisplayName = (roleId: string) => {
    switch (roleId) {
      case 'super_admin': return 'Super Admin';
      case 'tenant_owner': return 'Propietario';
      case 'admin_clinic': return 'Administrador';
      case 'receptionist': return 'Recepcionista';
      case 'health_pro': return 'Kinesiólogo';
      default: return roleId;
    }
  };

  const getRoleBadgeVariant = (roleId: string) => {
    switch (roleId) {
      case 'super_admin':
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

  const handleClinicCreated = () => {
    setCreateDialogOpen(false);
    setIsLoading(true);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Seleccionar Clínica</h1>
          <p className="text-muted-foreground">
            Elige la clínica y el rol con el que deseas trabajar
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {state.currentUser && (
              <Badge variant="outline">{state.currentUser.name}</Badge>
            )}
            {state.isSuperAdmin && (
              <Badge variant="destructive">Super Admin</Badge>
            )}
          </div>
        </div>

        {/* Super Admin: Create Clinic Button */}
        {state.isSuperAdmin && (
          <div className="flex justify-end">
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Nueva Clínica
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando clínicas...</p>
          </div>
        )}

        {/* No Clinics */}
        {!isLoading && groupedClinics.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Building className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No hay clínicas en el sistema</h3>
                <p className="text-sm text-muted-foreground">
                  {state.isSuperAdmin 
                    ? 'Crea la primera clínica para comenzar'
                    : 'Contacta al administrador para obtener acceso'}
                </p>
              </div>
              {state.isSuperAdmin && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Clínica
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Clinics Grid */}
        {!isLoading && groupedClinics.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedClinics.map((clinic) => (
              <Card 
                key={clinic.id}
                className={`transition-all ${
                  selectedClinic === clinic.id 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : 'hover:shadow-md'
                }`}
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

                  {/* Role selection */}
                  <div className="space-y-2 pt-2">
                    {clinic.roles.length === 1 ? (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4" />
                          <Badge variant={getRoleBadgeVariant(clinic.roles[0].role_id) as any} className="text-xs">
                            {getRoleDisplayName(clinic.roles[0].role_id)}
                          </Badge>
                        </div>
                        <Button 
                          variant={selectedClinic === clinic.id ? "default" : "outline"}
                          className="w-full"
                          disabled={selectedClinic === clinic.id}
                          onClick={() => handleSelectClinic(clinic.id, clinic.name, clinic.roles[0].role_id)}
                        >
                          {selectedClinic === clinic.id ? 'Seleccionada' : 'Seleccionar'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Selecciona tu rol:
                        </p>
                        <div className="flex flex-col gap-2">
                          {clinic.roles.map((role) => (
                            <Button
                              key={role.role_id}
                              variant="outline"
                              className="w-full justify-start gap-2"
                              disabled={selectedClinic === clinic.id}
                              onClick={() => handleSelectClinic(clinic.id, clinic.name, role.role_id)}
                            >
                              <Badge variant={getRoleBadgeVariant(role.role_id) as any} className="text-xs">
                                {getRoleDisplayName(role.role_id)}
                              </Badge>
                              <span className="text-sm">Ingresar como {getRoleDisplayName(role.role_id)}</span>
                            </Button>
                          ))}
                        </div>
                      </>
                    )}
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

      {/* Create Clinic Dialog for Super Admin */}
      {state.isSuperAdmin && (
        <CreateClinicDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleClinicCreated}
          isSuperAdmin={true}
        />
      )}
    </div>
  );
};