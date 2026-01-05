import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Globe, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Toronto', label: 'Toronto (GMT-5)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
];

const COUNTRIES = [
  { value: 'AR', label: 'Argentina' },
  { value: 'CA', label: 'Canadá' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'MX', label: 'México' },
  { value: 'CL', label: 'Chile' },
  { value: 'BR', label: 'Brasil' },
  { value: 'ES', label: 'España' },
];

const CURRENCIES = [
  { value: 'ARS', label: 'Peso Argentino (ARS)' },
  { value: 'CAD', label: 'Dólar Canadiense (CAD)' },
  { value: 'USD', label: 'Dólar Estadounidense (USD)' },
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'CLP', label: 'Peso Chileno (CLP)' },
  { value: 'BRL', label: 'Real Brasileño (BRL)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

export const CreateClinicPage = () => {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('AR');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [currency, setCurrency] = useState('ARS');
  const [isCreating, setIsCreating] = useState(false);
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  // Guard: redirect if user cannot create clinic
  useEffect(() => {
    if (!state.isLoadingAuth && !state.canCreateClinic && !state.currentClinicId) {
      navigate('/no-access', { replace: true });
    }
  }, [state.isLoadingAuth, state.canCreateClinic, state.currentClinicId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se encontró usuario autenticado');
        setIsCreating(false);
        return;
      }

      // Get or create user in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      let userId = existingUser?.id;

      if (!userId) {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
          })
          .select('id')
          .single();

        if (userError) {
          console.error('Error creating user:', userError);
          toast.error('Error al crear usuario');
          setIsCreating(false);
          return;
        }

        userId = newUser.id;
      }

      // Create clinic
      const { data: newClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name,
          country_code: countryCode,
          timezone,
          default_currency: currency,
          default_locale: 'es',
          is_active: true,
        })
        .select('id, name')
        .single();

      if (clinicError) {
        console.error('Error creating clinic:', clinicError);
        toast.error('Error al crear la clínica');
        setIsCreating(false);
        return;
      }

      // Create clinic_settings with defaults
      const { error: settingsError } = await supabase
        .from('clinic_settings')
        .insert({
          clinic_id: newClinic.id,
          min_slot_minutes: 30,
          workday_start: '08:00',
          workday_end: '19:00',
          allow_professional_self_block: true,
          auto_mark_no_show: true,
          auto_mark_no_show_time: '00:00',
        });

      if (settingsError) {
        console.error('Error creating clinic settings:', settingsError);
        // Continue anyway, settings can be created later
      }

      // Assign user as tenant_owner and admin_clinic
      const rolesToAssign = [
        {
          user_id: userId,
          clinic_id: newClinic.id,
          role_id: 'tenant_owner',
          active: true,
        },
        {
          user_id: userId,
          clinic_id: newClinic.id,
          role_id: 'admin_clinic',
          active: true,
        },
      ];

      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(rolesToAssign);

      if (rolesError) {
        console.error('Error assigning roles:', rolesError);
        toast.error('Error al asignar roles');
        setIsCreating(false);
        return;
      }

      // Update app context
      dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: newClinic.id, name: newClinic.name } });
      dispatch({ type: 'SET_USER_ROLE', payload: 'admin' });
      dispatch({ type: 'SET_CAN_CREATE_CLINIC', payload: false }); // Clear flag after clinic creation

      toast.success(`Clínica "${newClinic.name}" creada exitosamente`);
      navigate('/calendar', { replace: true });
    } catch (error) {
      console.error('Error creating clinic:', error);
      toast.error('Error al crear la clínica');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Building className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Crear Mi Clínica</h1>
          <p className="text-muted-foreground">
            Configura tu primera clínica para comenzar a usar el sistema
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Clínica</CardTitle>
            <CardDescription>
              Completa los datos básicos de tu clínica. Podrás editar esta información más adelante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Clinic Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Nombre de la Clínica *
                </Label>
                <Input
                  id="name"
                  placeholder="Centro de Kinesiología Norte"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  País *
                </Label>
                <Select value={countryCode} onValueChange={setCountryCode} required>
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Zona Horaria *
                </Label>
                <Select value={timezone} onValueChange={setTimezone} required>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Moneda *
                </Label>
                <Select value={currency} onValueChange={setCurrency} required>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={isCreating}>
                  {isCreating ? 'Creando...' : 'Crear Clínica'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
