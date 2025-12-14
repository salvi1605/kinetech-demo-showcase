import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, Database, FlaskConical, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { seedDemoData, clearDemoData, getDemoClinicId } from '@/lib/demoDataService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UserManagementCard } from '@/components/settings/UserManagementCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ClinicOption {
  id: string;
  name: string;
}

export const Settings = () => {
  const { state, dispatch } = useApp();
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const { toast } = useToast();
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const navigate = useNavigate();

  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [isClearingDemo, setIsClearingDemo] = useState(false);

  // Fetch clinics for user management
  useEffect(() => {
    const fetchClinics = async () => {
      const { data } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('is_active', true);
      if (data) setClinics(data);
    };
    fetchClinics();
  }, []);

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

  const handleSeedDemo = async () => {
    setIsSeedingDemo(true);
    try {
      const result = await seedDemoData();
      
      if (result.success) {
        toast({
          title: "Datos demo cargados",
          description: `Creados: ${result.counts.patients} pacientes, ${result.counts.practitioners} profesionales, ${result.counts.appointments} turnos`,
        });

        // Switch to demo clinic if created
        if (result.clinicId) {
          dispatch({ 
            type: 'SET_CURRENT_CLINIC', 
            payload: { id: result.clinicId, name: 'Clínica Demo' } 
          });
          toast({
            title: "Clínica cambiada",
            description: "Ahora estás en la Clínica Demo",
          });
        }
      } else {
        toast({
          title: "Error al cargar datos demo",
          description: result.error || "Ocurrió un error desconocido",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos demo",
        variant: "destructive",
      });
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const handleClearDemo = async () => {
    setIsClearingDemo(true);
    try {
      // Check if current clinic is the demo clinic
      const demoClinicId = await getDemoClinicId();
      const isInDemoClinic = state.currentClinicId === demoClinicId;

      const result = await clearDemoData();
      
      if (result.success) {
        toast({
          title: "Datos demo eliminados",
          description: `Eliminados: ${result.counts.appointments} turnos, ${result.counts.patients} pacientes, ${result.counts.practitioners} profesionales`,
        });

        // If user was in demo clinic, redirect to select-clinic
        if (isInDemoClinic) {
          dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: '', name: '' } });
          navigate('/select-clinic');
        }
      } else {
        toast({
          title: "Error al borrar datos demo",
          description: result.error || "Ocurrió un error desconocido",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron borrar los datos demo",
        variant: "destructive",
      });
    } finally {
      setIsClearingDemo(false);
    }
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
        <RoleGuard allowedRoles={['admin', 'tenant_owner']}>
          {state.currentClinicId && (
            <UserManagementCard
              clinicId={state.currentClinicId}
              clinicName={state.currentClinicName || 'Clínica'}
              clinics={clinics}
            />
          )}
        </RoleGuard>

        {/* Configuración del Sistema - Solo Admin */}
        <RoleGuard allowedRoles={['admin', 'tenant_owner']}>
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
        <RoleGuard allowedRoles={['admin', 'tenant_owner']}>
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

        {/* Demo Mode - Solo tenant_owner y admin_clinic (verificado desde BD) */}
        {!isLoadingRole && isAdmin && (
          <Card className="border-dashed border-amber-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-amber-500" />
                Demo (interno)
                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-400">
                  Admin Only
                </Badge>
              </CardTitle>
              <CardDescription>
                Carga datos de demostración para pruebas. Los datos se almacenan en una clínica separada "Clínica Demo".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <Label>Cargar datos demo</Label>
                  <p className="text-sm text-muted-foreground">
                    Crea una Clínica Demo con 10 pacientes, 3 profesionales y 30 turnos de ejemplo
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-amber-400 text-amber-600 hover:bg-amber-50"
                      disabled={isSeedingDemo}
                    >
                      {isSeedingDemo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Cargar datos demo
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cargar datos de demostración?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se creará una "Clínica Demo" con pacientes, profesionales y turnos de ejemplo.
                        Serás redirigido automáticamente a esta clínica para verla en acción.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSeedDemo}>
                        Cargar demo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <Separator />
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <Label>Borrar datos demo</Label>
                  <p className="text-sm text-muted-foreground">
                    Elimina completamente la Clínica Demo y todos sus datos asociados
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      disabled={isClearingDemo}
                    >
                      {isClearingDemo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Borrando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Borrar datos demo
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar datos de demostración?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará permanentemente la "Clínica Demo" y todos sus datos 
                        (pacientes, profesionales, turnos). Las clínicas reales no serán afectadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleClearDemo}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar demo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
