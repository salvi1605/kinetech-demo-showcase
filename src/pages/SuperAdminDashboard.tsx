import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, UserCheck, CalendarDays, TrendingUp, AlertTriangle, Plus, ArrowRight, Shield, CalendarIcon, Trash2, UserPlus, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CreateClinicDialog } from '@/components/clinics/CreateClinicDialog';
import { format, subDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ROOT_USER_ID = 'f6157dc0-677c-4fd7-8441-bc424c4e5056';

type DatePreset = '7d' | '30d' | '90d' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
}

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

interface SuperAdminUser {
  roleId: string;
  userId: string;
  fullName: string;
  email: string;
}

interface ClinicOption {
  id: string;
  name: string;
}

const ALL_ROLES = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'tenant_owner', label: 'Dueño de clínica' },
  { id: 'admin_clinic', label: 'Admin de clínica' },
  { id: 'receptionist', label: 'Recepcionista' },
  { id: 'health_pro', label: 'Profesional de salud' },
];

export default function SuperAdminDashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [clinicStats, setClinicStats] = useState<ClinicStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
    preset: '30d',
  });

  // User management state
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [clinicOptions, setClinicOptions] = useState<ClinicOption[]>([]);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', roleId: '', clinicId: '' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteUserId, setPromoteUserId] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    if (!state.isSuperAdmin) {
      navigate('/login', { replace: true });
      return;
    }
    loadDashboardData();
  }, [state.isSuperAdmin, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (state.isSuperAdmin) {
      loadSuperAdmins();
    }
  }, [state.isSuperAdmin]);

  const loadSuperAdmins = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('id, user_id, users!user_roles_user_id_fkey(full_name, email)')
      .eq('role_id', 'super_admin')
      .eq('active', true);

    if (data) {
      setSuperAdmins(data.map((r: any) => ({
        roleId: r.id,
        userId: r.user_id,
        fullName: r.users?.full_name || '',
        email: r.users?.email || '',
      })));
    }

    // Load all users for promote dialog
    const { data: users } = await supabase.from('users').select('id, full_name, email').eq('is_active', true).order('full_name');
    if (users) {
      setAllUsers(users.map(u => ({ id: u.id, fullName: u.full_name, email: u.email })));
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name, timezone, country_code, is_active')
        .order('name');
      if (clinicsError) throw clinicsError;

      setClinicOptions((clinics || []).map(c => ({ id: c.id, name: c.name })));

      const today = format(new Date(), 'yyyy-MM-dd');
      const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      const dateTo = format(dateRange.to, 'yyyy-MM-dd');

      const [
        { data: patients },
        { data: practitioners },
        { data: appointments },
        { data: users },
        { data: auditLogs },
      ] = await Promise.all([
        supabase.from('patients').select('id, clinic_id').eq('is_deleted', false),
        supabase.from('practitioners').select('id, clinic_id, is_active'),
        supabase.from('appointments').select('id, clinic_id, status, date').gte('date', dateFrom).lte('date', dateTo),
        supabase.from('users').select('id, is_active'),
        supabase.from('audit_log').select('id, clinic_id, action, entity_type, created_at, payload').order('created_at', { ascending: false }).limit(20),
      ]);

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
          id: clinic.id, name: clinic.name, timezone: clinic.timezone,
          country_code: clinic.country_code, is_active: clinic.is_active,
          totalPatients: clinicPatients.length, totalPractitioners: clinicPractitioners.length,
          totalAppointments: total, completedAppointments: completed,
          noShowAppointments: noShow, cancelledAppointments: cancelled,
          scheduledAppointments: scheduled, occupancyRate: occupancy,
        };
      });

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
    const entityMap: Record<string, string> = { appointment: 'Cita', patient: 'Paciente', user: 'Usuario', clinic: 'Clínica' };
    const actionMap: Record<string, string> = { create: 'creado/a', update: 'actualizado/a', delete: 'eliminado/a', cancel: 'cancelado/a', reschedule: 'reprogramado/a' };
    return `${entityMap[entityType] || entityType} ${actionMap[action] || action}`;
  };

  const handleSelectClinic = (clinicId: string, clinicName: string) => {
    dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: clinicId, name: clinicName } });
    navigate('/', { replace: true });
    toast({ title: 'Clínica seleccionada', description: `Accediendo a ${clinicName}` });
  };

  const handleCreateDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) loadDashboardData();
  };

  // ─── User Management Handlers ───

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName || !newUser.roleId) {
      toast({ title: 'Error', description: 'Completa todos los campos obligatorios', variant: 'destructive' });
      return;
    }
    // Clinic is optional — user may not have a clinic created yet
    if (newUser.password.length < 8) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' });
      return;
    }

    setIsCreatingUser(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.fullName,
          roleId: newUser.roleId,
          clinicId: newUser.roleId === 'super_admin' ? null : newUser.clinicId,
        },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || 'Error desconocido');
      }

      toast({ title: 'Usuario creado', description: `${newUser.fullName} (${newUser.email})` });
      setCreateUserOpen(false);
      setNewUser({ email: '', password: '', fullName: '', roleId: '', clinicId: '' });
      loadSuperAdmins();
      loadDashboardData();
    } catch (err: any) {
      toast({ title: 'Error al crear usuario', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleRevokeSuperAdmin = async (roleId: string, userId: string, name: string) => {
    if (userId === ROOT_USER_ID) {
      toast({ title: 'Protegido', description: 'No se puede revocar el super admin raíz', variant: 'destructive' });
      return;
    }
    setIsRevokingId(roleId);
    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
      toast({ title: 'Rol revocado', description: `Se revocó super_admin de ${name}` });
      loadSuperAdmins();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRevokingId(null);
    }
  };

  const handlePromoteToSuperAdmin = async () => {
    if (!promoteUserId) return;
    const alreadySA = superAdmins.some(sa => sa.userId === promoteUserId);
    if (alreadySA) {
      toast({ title: 'Ya es super admin', variant: 'destructive' });
      return;
    }
    setIsPromoting(true);
    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: promoteUserId,
        role_id: 'super_admin',
        clinic_id: null,
        active: true,
      });
      if (error) throw error;
      toast({ title: 'Promovido', description: 'Usuario promovido a super admin' });
      setPromoteOpen(false);
      setPromoteUserId('');
      loadSuperAdmins();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsPromoting(false);
    }
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
                  Vista global • {format(dateRange.from, "dd MMM yyyy", { locale: es })} – {format(dateRange.to, "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {([
                  { key: '7d' as DatePreset, label: '7 días' },
                  { key: '30d' as DatePreset, label: '30 días' },
                  { key: '90d' as DatePreset, label: '90 días' },
                ]).map(p => (
                  <button
                    key={p.key}
                    onClick={() => setDateRange({ from: subDays(new Date(), p.key === '7d' ? 7 : p.key === '30d' ? 30 : 90), to: new Date(), preset: p.key })}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      dateRange.preset === p.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={dateRange.preset === 'custom' ? 'default' : 'outline'} size="sm" className="h-8">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    Personalizado
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to, preset: 'custom' });
                      } else if (range?.from) {
                        setDateRange({ from: range.from, to: range.from, preset: 'custom' });
                      }
                    }}
                    numberOfMonths={2}
                    locale={es}
                    disabled={(date) => date > new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <Button variant="outline" size="sm" className="h-8" onClick={() => navigate('/select-clinic')}>
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                Seleccionar clínica
              </Button>
              <Button size="sm" className="h-8" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
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
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Citas ({dateRange.preset === '7d' ? '7d' : dateRange.preset === '30d' ? '30d' : dateRange.preset === '90d' ? '90d' : `${differenceInDays(dateRange.to, dateRange.from) + 1}d`})</p>
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

          {/* Right column: Activity + Quick Actions */}
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
                <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setCreateUserOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2 text-primary" />
                  Crear usuario
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── User Management Section ─── */}
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Gestión de Usuarios</h2>
          </div>

          <Tabs defaultValue="super_admins" className="w-full">
            <TabsList>
              <TabsTrigger value="super_admins">Super Admins</TabsTrigger>
              <TabsTrigger value="create_user">Crear Usuario</TabsTrigger>
            </TabsList>

            {/* ── Super Admins Tab ── */}
            <TabsContent value="super_admins" className="space-y-4">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">Super Admins activos</CardTitle>
                      <CardDescription className="text-xs">Usuarios con acceso global a todas las clínicas</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setPromoteOpen(true); setPromoteUserId(''); }}>
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                      Promover usuario
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {superAdmins.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin super admins</TableCell></TableRow>
                      ) : superAdmins.map(sa => (
                        <TableRow key={sa.roleId}>
                          <TableCell className="font-medium">
                            {sa.fullName}
                            {sa.userId === ROOT_USER_ID && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">raíz</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{sa.email}</TableCell>
                          <TableCell>
                            {sa.userId !== ROOT_USER_ID && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={isRevokingId === sa.roleId}
                                onClick={() => handleRevokeSuperAdmin(sa.roleId, sa.userId, sa.fullName)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Create User Tab ── */}
            <TabsContent value="create_user" className="space-y-4">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Crear nuevo usuario</CardTitle>
                  <CardDescription className="text-xs">Crea un usuario y asígnalo a una clínica con un rol específico</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div className="space-y-2">
                      <Label htmlFor="cu-name">Nombre completo *</Label>
                      <Input id="cu-name" placeholder="Nombre del usuario" value={newUser.fullName} onChange={e => setNewUser(p => ({ ...p, fullName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cu-email">Email *</Label>
                      <Input id="cu-email" type="email" placeholder="correo@ejemplo.com" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cu-pass">Contraseña * (mín. 8 caracteres)</Label>
                      <Input id="cu-pass" type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rol *</Label>
                      <Select value={newUser.roleId} onValueChange={v => setNewUser(p => ({ ...p, roleId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newUser.roleId && newUser.roleId !== 'super_admin' && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Clínica *</Label>
                        <Select value={newUser.clinicId} onValueChange={v => setNewUser(p => ({ ...p, clinicId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar clínica" /></SelectTrigger>
                          <SelectContent>
                            {clinicOptions.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="sm:col-span-2 pt-2">
                      <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {isCreatingUser ? 'Creando...' : 'Crear usuario'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ─── Promote to Super Admin Dialog ─── */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Promover a Super Admin</DialogTitle>
            <DialogDescription>Selecciona un usuario existente para otorgarle acceso global</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={promoteUserId} onValueChange={setPromoteUserId}>
              <SelectTrigger><SelectValue placeholder="Buscar usuario..." /></SelectTrigger>
              <SelectContent>
                {allUsers
                  .filter(u => !superAdmins.some(sa => sa.userId === u.id))
                  .map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)}>Cancelar</Button>
            <Button onClick={handlePromoteToSuperAdmin} disabled={!promoteUserId || isPromoting}>
              {isPromoting ? 'Promoviendo...' : 'Promover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateClinicDialog open={createDialogOpen} onOpenChange={handleCreateDialogClose} onSuccess={loadDashboardData} />
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
