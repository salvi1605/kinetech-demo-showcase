import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useClinicUsers, UserWithRole, Role } from '@/hooks/useClinicUsers';
import { NewUserDialog } from '@/components/dialogs/NewUserDialog';
import { EditUserDialog } from '@/components/dialogs/EditUserDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserManagementCardProps {
  clinicId: string;
  clinicName: string;
  clinics: Array<{ id: string; name: string }>;
}

export function UserManagementCard({ clinicId, clinicName, clinics }: UserManagementCardProps) {
  const { toast } = useToast();
  const { users, roles, isLoading, refetch } = useClinicUsers(clinicId);
  
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getRoleBadge = (roleId: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      'tenant_owner': { label: 'Propietario', variant: 'default' },
      'admin_clinic': { label: 'Admin', variant: 'default' },
      'receptionist': { label: 'Recepción', variant: 'secondary' },
      'health_pro': { label: 'Profesional', variant: 'outline' },
    };
    const roleConfig = config[roleId] || { label: roleId, variant: 'outline' as const };
    return <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>;
  };

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowEditUserDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete user role from this clinic (not the entire user)
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id)
        .eq('clinic_id', clinicId);

      if (error) throw error;

      toast({
        title: "Usuario removido",
        description: `${userToDelete.full_name} ya no tiene acceso a esta clínica`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Usuarios
          </CardTitle>
          <CardDescription>
            Usuarios con acceso a <strong>{clinicName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button size="sm" onClick={() => setShowNewUserDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo usuario
            </Button>
          </div>
          
          <Separator />

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground border rounded-lg bg-muted/30">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay usuarios en esta clínica</p>
              <p className="text-xs mt-1">Crea el primer usuario para comenzar.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userRole = user.user_roles.find(r => r.clinic_id === clinicId);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          {userRole ? getRoleBadge(userRole.role_id) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active !== false ? 'outline' : 'secondary'}>
                            {user.is_active !== false ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setUserToDelete(user)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewUserDialog
        open={showNewUserDialog}
        onOpenChange={setShowNewUserDialog}
        roles={roles}
        clinicId={clinicId}
        onSuccess={refetch}
      />

      <EditUserDialog
        open={showEditUserDialog}
        onOpenChange={setShowEditUserDialog}
        user={selectedUser}
        roles={roles}
        clinics={clinics}
        onSuccess={refetch}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar acceso del usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete?.full_name} perderá acceso a <strong>{clinicName}</strong>.
              Esta acción no elimina la cuenta del usuario, solo su acceso a esta clínica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar acceso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
