import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Settings as SettingsIcon, User, Shield, Database, Loader2, Download, KeyRound, CheckCircle2 } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useToast } from '@/hooks/use-toast';
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

type LoadState = 'loading' | 'ready' | 'error';

export const Settings = () => {
  const { state } = useApp();
  const { toast } = useToast();
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isSuperAdmin = state.userRole === 'super_admin' && !state.isImpersonatingRole;

  const [stats, setStats] = useState({ patients: 0, practitioners: 0, appointments: 0 });
  const [statsState, setStatsState] = useState<LoadState>('loading');
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [backupState, setBackupState] = useState<LoadState>('loading');

  useEffect(() => {
    const fetchClinics = async () => {
      const { data } = await supabase.from('clinics').select('id, name').eq('is_active', true);
      if (data) setClinics(data);
    };
    fetchClinics();
  }, []);

  useEffect(() => {
    const clinicId = state.currentClinicId;
    if (!clinicId) return;
    let cancelled = false;

    const fetchStats = async () => {
      setStatsState('loading');
      const [p, pr, a] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('is_deleted', false),
        supabase.from('practitioners').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('is_active', true),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
      ]);
      if (cancelled) return;
      if (p.error || pr.error || a.error) {
        setStatsState('error');
        return;
      }
      setStats({ patients: p.count || 0, practitioners: pr.count || 0, appointments: a.count || 0 });
      setStatsState('ready');
    };

    const fetchBackup = async () => {
      setBackupState('loading');
      const { data, error } = await supabase.rpc('get_last_clinic_backup_at', { _clinic_id: clinicId });
      if (cancelled) return;
      if (error) {
        setBackupState('error');
        return;
      }
      setLastBackupAt((data as string | null) ?? null);
      setBackupState('ready');
    };

    fetchStats();
    if (['admin_clinic', 'tenant_owner', 'super_admin'].includes(state.userRole)) fetchBackup();
    return () => { cancelled = true; };
  }, [state.currentClinicId, state.userRole]);

  const handleExportData = async () => {
    if (!state.currentClinicId) return;
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-clinic-data', {
        body: { clinic_id: state.currentClinicId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (state.currentClinicName || 'clinica')
        .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      a.href = url;
      a.download = `clinica-${safeName}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast({ title: 'Datos exportados', description: 'Se descargó el archivo con los datos de la clínica.' });
    } catch (err: any) {
      console.error('Export error:', err);
      toast({ title: 'Error al exportar', description: err?.message || 'No se pudieron exportar los datos', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const backupText =
    backupState === 'loading'
      ? 'Cargando…'
      : backupState === 'error'
        ? 'No se pudo obtener la fecha del último respaldo'
        : lastBackupAt
          ? `Último respaldo: ${format(new Date(lastBackupAt), 'dd/MM/yyyy HH:mm')}`
          : 'Aún no hay respaldos registrados para esta clínica';

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Configuración
        </h1>
        <p className="text-muted-foreground">Administra tu cuenta y la configuración de la clínica</p>
      </div>

      <div className="grid gap-6">
        {/* Mi cuenta - todos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Mi cuenta
            </CardTitle>
            <CardDescription>Gestiona el acceso a tu cuenta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label>Cambiar contraseña</Label>
                <p className="text-sm text-muted-foreground">Actualiza tu contraseña de acceso</p>
              </div>
              <Button variant="outline" size="sm" className="self-start sm:self-auto min-h-[44px] sm:min-h-0" onClick={() => setShowChangePassword(true)}>
                <KeyRound className="h-4 w-4 mr-2" />
                Cambiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />

        <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']}>
          {state.currentClinicId && (
            <UserManagementCard
              clinicId={state.currentClinicId}
              clinicName={state.currentClinicName || 'Clínica'}
              clinics={clinics}
            />
          )}
        </RoleGuard>

        {/* Seguridad y respaldos */}
        <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seguridad y respaldos
              </CardTitle>
              <CardDescription>Estado de los respaldos y del registro de cambios de esta clínica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label>Respaldos automáticos</Label>
                  <p className="text-sm text-muted-foreground">Se genera un respaldo diario de los datos. {backupText}</p>
                </div>
                <Badge variant="secondary" className="self-start sm:self-auto gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Activo
                </Badge>
              </div>
              <Separator />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label>Registro de auditoría</Label>
                  <p className="text-sm text-muted-foreground">Los cambios en turnos quedan registrados con usuario y fecha. No se puede desactivar.</p>
                </div>
                <Badge variant="secondary" className="self-start sm:self-auto gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Siempre activo
                </Badge>
              </div>
              {isSuperAdmin && (
                <>
                  <Separator />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label htmlFor="maintenance-mode">Modo mantenimiento</Label>
                      <p className="text-sm text-muted-foreground">Solo super admin. Todavía no tiene efecto.</p>
                    </div>
                    <Switch id="maintenance-mode" disabled />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </RoleGuard>

        {/* Datos de la clínica */}
        <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Datos de la clínica
              </CardTitle>
              <CardDescription>Resumen de la clínica activa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSuperAdmin && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label>Exportar datos</Label>
                      <p className="text-sm text-muted-foreground">Descarga un archivo JSON con los datos de la clínica activa</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="self-start sm:self-auto shrink-0 min-h-[44px] sm:min-h-0" disabled={isExporting || !state.currentClinicId}>
                          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                          {isExporting ? 'Exportando…' : 'Exportar'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Descargar los datos de {state.currentClinicName || 'la clínica'}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            El archivo contiene datos personales y de salud de los pacientes. Guárdalo en un lugar seguro y no lo compartas por canales no protegidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleExportData}>Descargar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label>Estadísticas</Label>
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {statsState === 'loading' && 'Cargando…'}
                    {statsState === 'error' && 'No se pudieron cargar las estadísticas'}
                    {statsState === 'ready' && `Pacientes: ${stats.patients} | Profesionales: ${stats.practitioners} | Turnos: ${stats.appointments}`}
                  </p>
                </div>
                <Badge variant="outline" className="self-start sm:self-auto">
                  {state.currentClinicName || 'Clínica activa'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </RoleGuard>
      </div>
    </div>
  );
};
