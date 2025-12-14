import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { EditClinicForm } from '@/components/clinics/EditClinicForm';
import { CreateClinicDialog } from '@/components/clinics/CreateClinicDialog';

interface Clinic {
  id: string;
  name: string;
  country_code: string | null;
  timezone: string;
  default_locale: string | null;
  default_currency: string | null;
  is_active: boolean | null;
}

interface ClinicSettings {
  id: string;
  clinic_id: string;
  min_slot_minutes: number | null;
  workday_start: string | null;
  workday_end: string | null;
  allow_professional_self_block: boolean | null;
  auto_mark_no_show: boolean | null;
  auto_mark_no_show_time: string | null;
}

export default function ClinicSettings() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  // Load clinics user has access to
  useEffect(() => {
    loadClinics();
  }, []);

  // Load clinic details when selected
  useEffect(() => {
    if (selectedClinicId) {
      loadClinicDetails(selectedClinicId);
    }
  }, [selectedClinicId]);

  const loadClinics = async () => {
    try {
      setIsLoading(true);

      // Get user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user record
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User record not found');

      // Get clinics where user has admin_clinic role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('clinic_id, clinics(id, name, country_code, timezone, default_locale, default_currency, is_active)')
        .eq('user_id', userData.id)
        .in('role_id', ['admin_clinic', 'tenant_owner'])
        .eq('active', true);

      if (userRoles && userRoles.length > 0) {
        const clinicsData = userRoles
          .map(ur => ur.clinics as unknown as Clinic)
          .filter(c => c && c.is_active);

        setClinics(clinicsData);

        // Set first clinic as selected if none selected
        if (!selectedClinicId && clinicsData.length > 0) {
          setSelectedClinicId(clinicsData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading clinics:', error);
      toast.error('Error al cargar clínicas');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClinicDetails = async (clinicId: string) => {
    try {
      // Load clinic data
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();

      if (clinicError) throw clinicError;
      setSelectedClinic(clinic);

      // Load clinic settings
      const { data: settings, error: settingsError } = await supabase
        .from('clinic_settings')
        .select('*')
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      setClinicSettings(settings);

      // Update context with clinic ID and name
      dispatch({ 
        type: 'SET_CURRENT_CLINIC', 
        payload: { id: clinicId, name: clinic.name } 
      });
    } catch (error) {
      console.error('Error loading clinic details:', error);
      toast.error('Error al cargar detalles de la clínica');
    }
  };

  const handleClinicChange = (clinicId: string) => {
    setSelectedClinicId(clinicId);
  };

  const handleClinicUpdated = () => {
    loadClinicDetails(selectedClinicId);
    loadClinics();
  };

  const handleClinicCreated = (clinicId: string) => {
    setCreateDialogOpen(false);
    loadClinics();
    setSelectedClinicId(clinicId);
    toast.success('Clínica creada exitosamente');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Gestión de Clínicas
            </h1>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tienes clínicas asignadas</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera clínica para comenzar
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Clínica
              </Button>
            </div>
          </CardContent>
        </Card>

        <CreateClinicDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleClinicCreated}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Gestión de Clínicas
          </h1>
          <p className="text-muted-foreground mt-1">
            Configura las clínicas y sus parámetros de agenda
          </p>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Clínica
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Clinic Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Clínica</CardTitle>
            <CardDescription>
              Elige la clínica que deseas configurar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedClinicId} onValueChange={handleClinicChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar clínica" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Clinic Details and Settings */}
        {selectedClinic && (
          <EditClinicForm
            clinic={selectedClinic}
            settings={clinicSettings}
            onSuccess={handleClinicUpdated}
          />
        )}
      </div>

      <CreateClinicDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleClinicCreated}
      />
    </div>
  );
}
