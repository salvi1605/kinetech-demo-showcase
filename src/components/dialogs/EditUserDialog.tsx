import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Key, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const editUserSchema = z.object({
  fullName: z.string().min(1, "Nombre completo requerido"),
  email: z.string().email("Email inválido"),
  roleId: z.string().min(1, "Rol requerido"),
  clinicId: z.string().min(1, "Clínica requerida"),
  isActive: z.boolean(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

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

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    values: user
      ? {
          fullName: user.full_name,
          email: user.email,
          roleId: user.user_roles[0]?.role_id || "",
          clinicId: user.user_roles[0]?.clinic_id || "",
          isActive: user.is_active ?? true,
        }
      : undefined,
  });

  const onSubmit = async (data: EditUserFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase.functions.invoke(
        "update-user",
        {
          body: {
            action: "update_profile",
            userId: user.id,
            fullName: data.fullName,
            email: data.email,
          },
        }
      );

      if (profileError) throw profileError;

      // Update role if changed
      if (
        data.roleId !== user.user_roles[0]?.role_id ||
        data.clinicId !== user.user_roles[0]?.clinic_id
      ) {
        const { error: roleError } = await supabase.functions.invoke(
          "update-user",
          {
            body: {
              action: "update_role",
              userId: user.id,
              roleId: data.roleId,
              clinicId: data.clinicId,
            },
          }
        );

        if (roleError) throw roleError;
      }

      // Update active status if changed
      if (data.isActive !== (user.is_active ?? true)) {
        const { error: statusError } = await supabase.functions.invoke(
          "update-user",
          {
            body: {
              action: "toggle_active",
              userId: user.id,
              isActive: data.isActive,
            },
          }
        );

        if (statusError) throw statusError;
      }

      toast({
        title: "Usuario actualizado",
        description: "Los cambios se guardaron correctamente",
      });

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
        body: {
          action: "reset_password",
          userId: user.id,
          resetPassword: true,
        },
      });

      if (error) throw error;

      setTempPassword(data.tempPassword);
      setShowResetDialog(true);

      toast({
        title: "Contraseña restablecida",
        description: "Se generó una nueva contraseña temporal",
      });
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>Rol</FormLabel>
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
                            {role.description || role.id}
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
                    <FormLabel>Clínica</FormLabel>
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

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Estado del Usuario</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {field.value ? "Activo" : "Inactivo"}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

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
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contraseña Temporal Generada</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Se ha generado una nueva contraseña temporal para el usuario.
                Comparte esta contraseña de forma segura:
              </p>
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
