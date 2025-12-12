import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, UserPlus, Shield, Pencil, Power, Link2 } from 'lucide-react';
import { z } from 'zod';
import { EditUserDialog } from '@/components/dialogs/EditUserDialog';
import { LinkPractitionerModal } from '@/components/dialogs/LinkPractitionerModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const createUserSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'El email es obligatorio'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  fullName: z.string().min(1, 'El nombre completo es obligatorio'),
  roleId: z.string().min(1, 'Debe seleccionar un rol'),
  clinicId: z.string().min(1, 'Debe seleccionar una clínica'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  user_roles: {
    role_id: string;
    clinic_id: string;
    active: boolean;
    clinics: {
      name: string;
    };
    roles: {
      id: string;
      description: string | null;
    };
  }[];
}

interface Role {
  id: string;
  description: string | null;
}

interface Clinic {
  id: string;
  name: string;
}

export default function UserManagement() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  // Para vincular usuario a profesional
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUserId, setLinkUserId] = useState<string>('');
  const [linkUserName, setLinkUserName] = useState<string>('');
  
  // Mapa de usuarios vinculados a practitioners
  const [userPractitionerMap, setUserPractitionerMap] = useState<Record<string, string>>({});

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      roleId: '',
      clinicId: '',
    },
  });

  // Check if user is admin
  useEffect(() => {
    if (!state.isAuthenticated) {
      navigate('/login');
      return;
    }
    if (state.userRole !== 'admin' && state.userRole !== 'tenant_owner') {
      toast.error('No tienes permisos para acceder a esta sección');
      navigate('/calendar');
      return;
    }
  }, [state.isAuthenticated, state.userRole, navigate]);

  // Load initial data for current clinic
  useEffect(() => {
    if (state.currentClinicId) {
      loadData();
    }
  }, [state.currentClinicId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      if (!state.currentClinicId) return;

      // Load users with their roles for current clinic only
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          is_active,
          user_roles!inner (
            role_id,
            clinic_id,
            active,
            clinics (name),
            roles (id, description)
          )
        `)
        .eq('user_roles.clinic_id', state.currentClinicId)
        .order('email');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('id');

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

      // Load clinics
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (clinicsError) throw clinicsError;
      setClinics(clinicsData || []);

      // Cargar mapa de usuarios vinculados a practitioners
      const { data: practitionersData, error: practError } = await supabase
        .from('practitioners')
        .select('user_id, display_name')
        .eq('clinic_id', state.currentClinicId)
        .not('user_id', 'is', null);

      if (!practError && practitionersData) {
        const map: Record<string, string> = {};
        practitionersData.forEach(p => {
          if (p.user_id) {
            map[p.user_id] = p.display_name;
          }
        });
        setUserPractitionerMap(map);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      setIsCreating(true);

      // Get auth token for edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Call edge function to create user
      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          roleId: data.roleId,
          clinicId: data.clinicId,
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (functionData.error) {
        throw new Error(functionData.error);
      }

      toast.success('Usuario creado exitosamente');
      form.reset();
      setDialogOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Error al crear usuario');
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleBadgeVariant = (roleId: string): "default" | "secondary" | "destructive" => {
    switch (roleId) {
      case 'admin_clinic':
        return 'destructive';
      case 'receptionist':
        return 'secondary';
      case 'health_pro':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (roleId: string): string => {
    switch (roleId) {
      case 'tenant_owner':
        return 'Propietario';
      case 'admin_clinic':
        return 'Administrador';
      case 'receptionist':
        return 'Recepcionista';
      case 'health_pro':
        return 'Profesional';
      default:
        return roleId;
    }
  };

  // Get primary role based on priority
  const getPrimaryRole = (userRoles: any[]): string => {
    const rolePriority: Record<string, number> = {
      'tenant_owner': 4,
      'admin_clinic': 3,
      'receptionist': 2,
      'health_pro': 1
    };

    const sortedRoles = [...userRoles].sort((a, b) => 
      (rolePriority[b.role_id] || 0) - (rolePriority[a.role_id] || 0)
    );

    return sortedRoles[0]?.role_id || '';
  };

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditUserDialogOpen(true);
  };

  const handleOpenLinkModal = (user: UserWithRole) => {
    setLinkUserId(user.id);
    setLinkUserName(user.full_name);
    setLinkModalOpen(true);
  };

  // Verificar si un usuario tiene rol health_pro
  const isHealthPro = (user: UserWithRole): boolean => {
    return user.user_roles.some(ur => ur.role_id === 'health_pro');
  };

  const handleToggleActive = async (user: UserWithRole) => {
    try {
      const currentActive = user.user_roles[0]?.active ?? true;
      const newStatus = !currentActive;
      
      // Update active status in user_roles for this clinic
      const { error } = await supabase
        .from('user_roles')
        .update({ active: newStatus })
        .eq('user_id', user.id)
        .eq('clinic_id', state.currentClinicId!);

      if (error) throw error;

      toast.success(newStatus ? 'Usuario activado' : 'Usuario desactivado');
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado del usuario');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Complete los datos para crear un nuevo usuario en el sistema
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="usuario@ejemplo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña Temporal *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Juan Pérez"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {getRoleLabel(role.id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clínica *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar clínica" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreating || !form.formState.isValid}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      'Crear Usuario'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados con sus roles y clínicas asignadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay usuarios registrados
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Profesional</TableHead>
                    <TableHead>Clínica</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        {(() => {
                          const primaryRole = getPrimaryRole(user.user_roles);
                          return (
                            <Badge
                              variant={getRoleBadgeVariant(primaryRole)}
                              className="mr-1"
                            >
                              {getRoleLabel(primaryRole)}
                            </Badge>
                          );
                        })()}
                        </TableCell>
                        <TableCell>
                          {/* Mostrar estado de vínculo solo para health_pro */}
                          {isHealthPro(user) ? (
                            userPractitionerMap[user.id] ? (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Vinculado: {userPractitionerMap[user.id]}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                No vinculado
                              </Badge>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.user_roles[0]?.clinics?.name || state.currentClinicName}
                        </TableCell>
                      <TableCell>
                        <Badge variant={user.user_roles[0]?.active ? 'default' : 'secondary'}>
                          {user.user_roles[0]?.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {/* Botón vincular solo para health_pro no vinculados */}
                            {isHealthPro(user) && !userPractitionerMap[user.id] && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenLinkModal(user)}
                                title="Vincular a profesional"
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={user.user_roles[0]?.active ? 'outline' : 'default'}
                              onClick={() => handleToggleActive(user)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <EditUserDialog
          open={editUserDialogOpen}
          onOpenChange={setEditUserDialogOpen}
          user={selectedUser}
          roles={roles}
          clinics={clinics}
          onSuccess={loadData}
        />

        {/* Modal para vincular usuario a profesional */}
        {state.currentClinicId && (
          <LinkPractitionerModal
            open={linkModalOpen}
            onOpenChange={setLinkModalOpen}
            userId={linkUserId}
            userName={linkUserName}
            clinicId={state.currentClinicId}
            onSuccess={loadData}
          />
        )}
      </div>
    );
  }
