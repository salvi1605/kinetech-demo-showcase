import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, UserCheck, CalendarDays, TrendingUp, TrendingDown, AlertTriangle, Plus, ArrowRight, Shield, Activity, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CreateClinicDialog } from '@/components/clinics/CreateClinicDialog';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClinicStats {
  id: string;
  name: string;
  timezone: string;
  country_code: string | null;
  is_active: boolean | null;
  totalPatients: number;
  totalPractitioners: number;
  totalAppointments: number;
  completedAppointments: number;
  noShowAppointments: number;
  cancelledAppointments: number;
  scheduledAppointments: number;
  occupancyRate: number;
}

interface RecentActivity {
  id: string;
  type: 'appointment' | 'patient' | 'user';
  action: string;
  clinicName: string;
  detail: string;
  timestamp: string;
}

interface GlobalStats {
  totalClinics: number;
  activeClinics: number;
  totalUsers: number;
  totalPatients: number;
  totalAppointmentsToday: number;
  globalOccupancy: number;
  globalNoShowRate: number;
}

export default function SuperAdminDashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [clinicStats, setClinicStats] = useState<ClinicStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!state.isSuperAdmin) {
      navigate('/login', { replace: true });
      return;
    }
    loadDashboardData();
  }, [state.isSuperAdmin]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch all clinics
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name, timezone, country_code, is_active')
        .order('name');
      if (clinicsError) throw clinicsError;

      // Fetch counts per clinic in parallel
      const today = format(new Date(), 'yyyy-MM-dd');
      const last30Days = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const [
        { data: patients },
        { data: practitioners },
        { data: appointments },
        { data: users },
        { data: auditLogs },
      ] = await Promise.all([
        supabase.from('patients').select('id, clinic_id').eq('is_deleted', false),
        supabase.from('practitioners').select('id, clinic_id, is_active'),
        supabase.from('appointments').select('id, clinic_id, status, date').gte('date', last30Days),
        supabase.from('users').select('id, is_active'),
        supabase.from('audit_log').select('id, clinic_id, action, entity_type, created_at, payload').order('created_at', { ascending: false }).limit(20),
      ]);

      // Build clinic stats
      const stats: ClinicStats[] = (clinics || []).map(clinic => {
        const clinicPatients = (patients || []).filter(p => p.clinic_id === clinic.id);
        const clinicPractitioners = (practitioners || []).filter(p => p.clinic_id === clinic.id && p.is_active);
        const clinicAppointments = (appointments || []).filter(a => a.clinic_id === clinic.id);
        const completed = clinicAppointments.filter(a => a.status === 'completed').length;
        const noShow = clinicAppointments.filter(a => a.status === 'no_show').length;
        const cancelled = clinicAppointments.filter(a => a.status === 'cancelled').length;
        const scheduled = clinicAppointments.filter(a => a.status === 'scheduled').length;
        const total = clinicAppointments.length;
        const nonCancelled = total - cancelled;
        const occupancy = nonCancelled > 0 ? Math.round((completed / nonCancelled) * 100) : 0;

        return {
          id: clinic.id,
          name: clinic.name,
          timezone: clinic.timezone,
          country_code: clinic.country_code,
          is_active: clinic.is_active,
          totalPatients: clinicPatients.length,
          totalPractitioners: clinicPractitioners.length,
          totalAppointments: total,
          completedAppointments: completed,
          noShowAppointments: noShow,
          cancelledAppointments: cancelled,
          scheduledAppointments: scheduled,
          occupancyRate: occupancy,
        };
      });

      // Global stats
      const todayAppointments = (appointments || []).filter(a => a.date === today);
      const allNonCancelled = (appointments || []).filter(a => a.status !== 'cancelled');
      const allCompleted = (appointments || []).filter(a => a.status === 'completed');
      const allNoShow = (appointments || []).filter(a => a.status === 'no_show');

      setGlobalStats({
        totalClinics: (clinics || []).length,
        activeClinics: (clinics || []).filter(c => c.is_active).length,
        totalUsers: (users || []).length,
        totalPatients: (patients || []).length,
        totalAppointmentsToday: todayAppointments.length,
        globalOccupancy: allNonCancelled.length > 0 ? Math.round((allCompleted.length / allNonCancelled.length) * 100) : 0,
        globalNoShowRate: allNonCancelled.length > 0 ? Math.round((allNoShow.length / allNonCancelled.length) * 100) : 0,
      });

      // Recent activity from audit log
      const clinicMap = new Map((clinics || []).map(c => [c.id, c.name]));
      const activities: RecentActivity[] = (auditLogs || []).map(log => ({
        id: log.id,
        type: log.entity_type as 'appointment' | 'patient' | 'user',
        action: log.action,
        clinicName: clinicMap.get(log.clinic_id || '') || 'Global',
        detail: formatActivityDetail(log.entity_type, log.action),
        timestamp: log.created_at || '',
      }));
      setRecentActivity(activities);

      setClinicStats(stats);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las estadísticas', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatActivityDetail = (entityType: string, action: string): string => {
    const entityMap: Record<string, string> = {
      appointment: 'Cita',
      patient: 'Paciente',
      user: 'Usuario',
      clinic: 'Clínica',
    };
    const actionMap: Record<string, string> = {
      create: 'creado/a',
      update: 'actualizado/a',
      delete: 'eliminado/a',
      cancel: 'cancelado/a',
      reschedule: 'reprogramado/a',
    };
    return `${entityMap[entityType] || entityType} ${actionMap[action] || action}`;
  };

  const handleSelectClinic = (clinicId: string, clinicName: string) => {
    dispatch({ type: 'SET_CLINIC', payload: { clinicId, clinicName } });
    navigate('/', { replace: true });
    toast({ title: 'Clínica seleccionada', description: `Accediendo a ${clinicName}` });
  };

  const handleClinicCreated = () => {
    setCreateDialogOpen(false);
    loadDashboardData();
    toast({ title: '¡Clínica creada!', description: 'La nueva clínica se ha creado correctamente.' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Panel Super Admin</h1>
                <p className="text-sm text-muted-foreground">
                  Vista global de todas las clínicas • Últimos 30 días
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/select-clinic')}>
                <Building2 className="h-4 w-4 mr-2" />
                Seleccionar clínica
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva clínica
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Global KPIs */}
        {globalStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={Building2} label="Clínicas" value={globalStats.totalClinics} sub={`${globalStats.activeClinics} activas`} />
            <KpiCard icon={Users} label="Usuarios" value={globalStats.totalUsers} />
            <KpiCard icon={UserCheck} label="Pacientes" value={globalStats.totalPatients} />
            <KpiCard icon={CalendarDays} label="Citas hoy" value={globalStats.totalAppointmentsToday} />
            <KpiCard icon={TrendingUp} label="Asistencia" value={`${globalStats.globalOccupancy}%`} variant="success" />
            <KpiCard icon={AlertTriangle} label="No-show" value={`${globalStats.globalNoShowRate}%`} variant={globalStats.globalNoShowRate > 15 ? 'destructive' : 'warning'} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clinic Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Clínicas</h2>
              <Badge variant="secondary">{clinicStats.length} total</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinicStats.map(clinic => (
                <Card key={clinic.id} className="hover:shadow-md transition-shadow cursor-pointer group border-border/60" onClick={() => handleSelectClinic(clinic.id, clinic.name)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{clinic.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {clinic.timezone} • {clinic.country_code || 'AR'}
                        </CardDescription>
                      </div>
                      <Badge variant={clinic.is_active ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {clinic.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-foreground">{clinic.totalPatients}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pacientes</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{clinic.totalPractitioners}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Profesionales</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{clinic.totalAppointments}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Citas (30d)</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Asistencia</span>
                        <span className="font-medium text-foreground">{clinic.occupancyRate}%</span>
                      </div>
                      <Progress value={clinic.occupancyRate} className="h-1.5" />
                    </div>

                    <div className="flex gap-2 text-xs">
                      <span className="text-accent">✓ {clinic.completedAppointments}</span>
                      <span className="text-destructive">✗ {clinic.noShowAppointments}</span>
                      <span className="text-muted-foreground">⊘ {clinic.cancelledAppointments}</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Actividad reciente</h2>
            <Card className="border-border/60">
              <ScrollArea className="h-[480px]">
                <div className="p-4 space-y-1">
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin actividad reciente</p>
                  ) : (
                    recentActivity.map((act, i) => (
                      <div key={act.id}>
                        <div className="flex items-start gap-3 py-2.5">
                          <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                            act.action === 'create' ? 'bg-accent' :
                            act.action === 'cancel' || act.action === 'delete' ? 'bg-destructive' :
                            'bg-primary'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{act.detail}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground truncate">{act.clinicName}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {act.timestamp ? format(new Date(act.timestamp), "dd MMM HH:mm", { locale: es }) : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        {i < recentActivity.length - 1 && <Separator />}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2 text-primary" />
                  Crear nueva clínica
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => navigate('/select-clinic')}>
                  <Building2 className="h-4 w-4 mr-2 text-primary" />
                  Gestionar clínica específica
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CreateClinicDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={handleClinicCreated} />
    </div>
  );
}

// ─── KPI Card ───
function KpiCard({ icon: Icon, label, value, sub, variant }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  variant?: 'success' | 'destructive' | 'warning';
}) {
  const colorMap = {
    success: 'text-accent',
    destructive: 'text-destructive',
    warning: 'text-warning',
  };
  const bgMap = {
    success: 'bg-accent/10',
    destructive: 'bg-destructive/10',
    warning: 'bg-warning/10',
  };
  const iconColor = variant ? colorMap[variant] : 'text-primary';
  const iconBg = variant ? bgMap[variant] : 'bg-primary/10';

  return (
    <Card className="border-border/60">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`h-7 w-7 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
        </div>
        <p className={`text-xl font-bold ${variant ? colorMap[variant] : 'text-foreground'}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
