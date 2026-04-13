import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Key, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Propietario",
  admin_clinic: "Administrador",
  receptionist: "Secretario/a",
  health_pro: "Kinesiólogo/a",
};

interface Role {
  id: string;
  description: string | null;
}

interface Clinic {
  id: string;
  name: string;
}

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean | null;
  user_roles: Array<{
    role_id: string;
    clinic_id: string;
  }>;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  roles: Role[];
  clinics: Clinic[];
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  roles,
  clinics,
  onSuccess,
}: EditUserDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Derive the clinicId from the user's existing roles
  const clinicId = user?.user_roles[0]?.clinic_id || "";

  // Assignable roles (exclude super_admin from UI)
  const assignableRoles = roles.filter(r => r.id !== "super_admin");

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setIsActive(user.is_active ?? true);
      // Collect all non-super_admin roles for this clinic
      const currentRoles = user.user_roles
        .filter(ur => ur.clinic_id === clinicId && ur.role_id !== "super_admin")
        .map(ur => ur.role_id);
      setSelectedRoles(currentRoles.length > 0 ? currentRoles : []);
    }
  }, [user, clinicId]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(r => r !== roleId)
        : [...prev, roleId]
    );
  };

  const onSubmit = async () => {
    if (!user || !clinicId) return;
    if (!fullName.trim()) {
      toast({ title: "Error", description: "Nombre completo requerido", variant: "destructive" });
      return;
    }
    if (selectedRoles.length === 0) {
      toast({ title: "Error", description: "Debe asignar al menos un rol", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase.functions.invoke("update-user", {
        body: { action: "update_profile", userId: user.id, fullName, email },
      });
      if (profileError) throw profileError;

      // Update roles (multi-role)
      const originalRoles = user.user_roles
        .filter(ur => ur.clinic_id === clinicId && ur.role_id !== "super_admin")
        .map(ur => ur.role_id)
        .sort();
      const newRoles = [...selectedRoles].sort();
      const rolesChanged = JSON.stringify(originalRoles) !== JSON.stringify(newRoles);

      if (rolesChanged) {
        const { error: rolesError } = await supabase.functions.invoke("update-user", {
          body: { action: "update_roles", userId: user.id, roleIds: selectedRoles, clinicId },
        });
        if (rolesError) throw rolesError;
      }

      // Update active status if changed
      if (isActive !== (user.is_active ?? true)) {
        const { error: statusError } = await supabase.functions.invoke("update-user", {
          body: { action: "toggle_active", userId: user.id, isActive },
        });
        if (statusError) throw statusError;
      }

      toast({ title: "Usuario actualizado", description: "Los cambios se guardaron correctamente" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-user", {
        body: { action: "reset_password", userId: user.id, resetPassword: true },
      });
      if (error) throw error;
      setTempPassword(data.tempPassword);
      setShowResetDialog(true);
      toast({ title: "Contraseña restablecida", description: "Se generó una nueva contraseña temporal" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo restablecer la contraseña",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullname">Nombre Completo</Label>
              <Input
                id="edit-fullname"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Roles asignados</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {assignableRoles.map(role => (
                  <div key={role.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <Label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {ROLE_LABELS[role.id] || role.description || role.id}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedRoles.length === 0 && (
                <p className="text-sm text-destructive">Debe asignar al menos un rol</p>
              )}
            </div>

            <div className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Estado del Usuario</Label>
                <div className="text-sm text-muted-foreground">
                  {isActive ? "Activo" : "Inactivo"}
                </div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetPassword}
                disabled={isLoading}
                className="flex-1"
              >
                <Key className="mr-2 h-4 w-4" />
                Restablecer Contraseña
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button onClick={onSubmit} disabled={isLoading || selectedRoles.length === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contraseña Temporal Generada</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Se ha generado una nueva contraseña temporal. Compártela de forma segura:</p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm font-bold">
                {tempPassword}
              </div>
              <p className="text-xs text-muted-foreground">
                El usuario deberá cambiarla en su próximo inicio de sesión.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResetDialog(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
