import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useToast } from '@/hooks/use-toast';

export const Settings = () => {
  const { state } = useApp();
  const { toast } = useToast();

  const handleExportData = async () => {
    try {
      const data = {
        patients: state.patients,
        practitioners: state.practitioners,
        appointments: state.appointments,
        preferences: state.preferences,
        exportDate: new Date().toISOString()
      };
      
      const dataText = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(dataText);
      
      toast({
        title: "Datos exportados",
        description: "Los datos del sistema han sido copiados al portapapeles en formato JSON",
      });
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudieron exportar los datos",
        variant: "destructive",
      });
    }
  };

  const handleClearCache = () => {
    toast({
      title: "Caché limpiado",
      description: "Los datos temporales han sido eliminados",
    });
  };


  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Personaliza el sistema según tus necesidades
        </p>
      </div>

      <div className="grid gap-6">
        {/* Preferencias UI - Visible para todos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Preferencias UI
            </CardTitle>
            <CardDescription>
              Personaliza tu experiencia de usuario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notificaciones por email</Label>
                <p className="text-sm text-muted-foreground">Recibe notificaciones de citas</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Notificaciones push</Label>
                <p className="text-sm text-muted-foreground">Alertas en tiempo real</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Tema oscuro</Label>
                <p className="text-sm text-muted-foreground">Cambiar a modo oscuro</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Vista compacta</Label>
                <p className="text-sm text-muted-foreground">Usar interfaz más compacta</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Gestión de Usuarios - Solo Admin */}
        <RoleGuard allowedRoles={['admin']}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Administra los usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label>Usuarios registrados</Label>
                  <p className="text-sm text-muted-foreground">Gestiona accesos y roles</p>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo usuario
                </Button>
              </div>
              <Separator />
              <div className="p-4 text-center text-muted-foreground border rounded-lg bg-muted/30">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Gestión de usuarios próximamente</p>
                <p className="text-xs mt-1">Esta funcionalidad estará disponible en una próxima versión.</p>
              </div>
            </CardContent>
          </Card>
        </RoleGuard>

        {/* Configuración del Sistema - Solo Admin */}
        <RoleGuard allowedRoles={['admin']}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuración del Sistema
              </CardTitle>
              <CardDescription>
                Opciones administrativas y de seguridad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Modo mantenimiento</Label>
                  <p className="text-sm text-muted-foreground">Activar para realizar actualizaciones</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Backups automáticos</Label>
                  <p className="text-sm text-muted-foreground">Respaldar datos diariamente</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Logs de auditoría</Label>
                  <p className="text-sm text-muted-foreground">Registrar acciones del sistema</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </RoleGuard>

        {/* Gestión de Datos - Solo Admin */}
        <RoleGuard allowedRoles={['admin']}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gestión de Datos
              </CardTitle>
              <CardDescription>
                Administra los datos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label>Exportar datos</Label>
                  <p className="text-sm text-muted-foreground">Descargar backup completo en JSON</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportData}>
                  Exportar
                </Button>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div>
                  <Label>Limpiar caché</Label>
                  <p className="text-sm text-muted-foreground">Borrar datos temporales del sistema</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearCache}>
                  Limpiar
                </Button>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div>
                  <Label>Estadísticas del sistema</Label>
                  <p className="text-sm text-muted-foreground">
                    Pacientes: {state.patients.length} | 
                    Profesionales: {state.practitioners.length} | 
                    Turnos: {state.appointments.length}
                  </p>
                </div>
                <Badge variant="outline">UI-Only</Badge>
              </div>
            </CardContent>
          </Card>
        </RoleGuard>
      </div>
    </div>
  );
};