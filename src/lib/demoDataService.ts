import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfWeek } from 'date-fns';

const DEMO_CLINIC_NAME = 'Clínica Demo';

// Demo patient names
const DEMO_PATIENTS = [
  { full_name: 'María García López', phone: '+54 11 5555-0001', email: 'maria.garcia@demo.com' },
  { full_name: 'Juan Carlos Rodríguez', phone: '+54 11 5555-0002', email: 'juan.rodriguez@demo.com' },
  { full_name: 'Ana Belén Martínez', phone: '+54 11 5555-0003', email: 'ana.martinez@demo.com' },
  { full_name: 'Pedro Pablo Fernández', phone: '+54 11 5555-0004', email: 'pedro.fernandez@demo.com' },
  { full_name: 'Laura Sofía Gómez', phone: '+54 11 5555-0005', email: 'laura.gomez@demo.com' },
  { full_name: 'Diego Armando Sánchez', phone: '+54 11 5555-0006', email: 'diego.sanchez@demo.com' },
  { full_name: 'Carolina Inés Díaz', phone: '+54 11 5555-0007', email: 'carolina.diaz@demo.com' },
  { full_name: 'Roberto Miguel Pérez', phone: '+54 11 5555-0008', email: 'roberto.perez@demo.com' },
  { full_name: 'Valentina Rosa Torres', phone: '+54 11 5555-0009', email: 'valentina.torres@demo.com' },
  { full_name: 'Martín Eduardo López', phone: '+54 11 5555-0010', email: 'martin.lopez@demo.com' },
];

// Demo practitioner names
const DEMO_PRACTITIONERS = [
  { display_name: 'Lic. Martín Ruiz', prefix: 'Lic.', color: '#3B82F6', specialties: ['Kinesiología Deportiva'] },
  { display_name: 'Dra. Carolina Vega', prefix: 'Dra.', color: '#10B981', specialties: ['Fisioterapia Neurológica'] },
  { display_name: 'Lic. Fernando Méndez', prefix: 'Lic.', color: '#F59E0B', specialties: ['Rehabilitación'] },
];

// Appointment times for the week
const APPOINTMENT_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

interface SeedResult {
  success: boolean;
  clinicId?: string;
  counts: {
    patients: number;
    practitioners: number;
    appointments: number;
  };
  error?: string;
}

interface ClearResult {
  success: boolean;
  counts: {
    appointments: number;
    patients: number;
    practitioners: number;
  };
  error?: string;
}

export const seedDemoData = async (): Promise<SeedResult> => {
  try {
    // 1. Create or get the demo clinic
    let clinicId: string;
    
    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('name', DEMO_CLINIC_NAME)
      .maybeSingle();

    if (existingClinic) {
      clinicId = existingClinic.id;
    } else {
      const { data: newClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: DEMO_CLINIC_NAME,
          timezone: 'America/Argentina/Buenos_Aires',
          default_locale: 'es',
          default_currency: 'ARS',
          country_code: 'AR',
          is_active: true,
        })
        .select('id')
        .single();

      if (clinicError) throw new Error(`Error creating clinic: ${clinicError.message}`);
      clinicId = newClinic.id;

      // Assign current user as admin_clinic for the demo clinic
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: publicUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .single();

        if (publicUser) {
          await supabase.from('user_roles').insert({
            user_id: publicUser.id,
            clinic_id: clinicId,
            role_id: 'admin_clinic',
            active: true,
          });
        }
      }
    }

    // 2. Create or update clinic_settings
    const { data: existingSettings } = await supabase
      .from('clinic_settings')
      .select('id')
      .eq('clinic_id', clinicId)
      .maybeSingle();

    if (!existingSettings) {
      await supabase.from('clinic_settings').insert({
        clinic_id: clinicId,
        workday_start: '08:00',
        workday_end: '19:00',
        min_slot_minutes: 30,
        auto_mark_no_show: true,
        auto_mark_no_show_time: '00:00',
        allow_professional_self_block: true,
      });
    }

    // 3. Insert demo patients (if not exist)
    const { data: existingPatients } = await supabase
      .from('patients')
      .select('id, full_name')
      .eq('clinic_id', clinicId)
      .eq('is_deleted', false);

    const existingPatientNames = new Set((existingPatients || []).map(p => p.full_name));
    const patientsToInsert = DEMO_PATIENTS.filter(p => !existingPatientNames.has(p.full_name));

    let insertedPatients = 0;
    if (patientsToInsert.length > 0) {
      const { data: newPatients, error: patientError } = await supabase
        .from('patients')
        .insert(patientsToInsert.map(p => ({
          ...p,
          clinic_id: clinicId,
          is_deleted: false,
        })))
        .select('id');

      if (patientError) throw new Error(`Error creating patients: ${patientError.message}`);
      insertedPatients = newPatients?.length || 0;
    }

    // 4. Insert demo practitioners (if not exist)
    const { data: existingPractitioners } = await supabase
      .from('practitioners')
      .select('id, display_name')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    const existingPractitionerNames = new Set((existingPractitioners || []).map(p => p.display_name));
    const practitionersToInsert = DEMO_PRACTITIONERS.filter(p => !existingPractitionerNames.has(p.display_name));

    let insertedPractitioners = 0;
    if (practitionersToInsert.length > 0) {
      const { data: newPractitioners, error: practitionerError } = await supabase
        .from('practitioners')
        .insert(practitionersToInsert.map(p => ({
          ...p,
          clinic_id: clinicId,
          is_active: true,
        })))
        .select('id');

      if (practitionerError) throw new Error(`Error creating practitioners: ${practitionerError.message}`);
      insertedPractitioners = newPractitioners?.length || 0;
    }

    // 5. Get all patients and practitioners for appointments
    const { data: allPatients } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('is_deleted', false);

    const { data: allPractitioners } = await supabase
      .from('practitioners')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (!allPatients?.length || !allPractitioners?.length) {
      return {
        success: true,
        clinicId,
        counts: {
          patients: insertedPatients,
          practitioners: insertedPractitioners,
          appointments: 0,
        },
      };
    }

    // 6. Create demo appointments for the current week
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const statuses: Array<'scheduled' | 'completed' | 'cancelled'> = ['scheduled', 'completed', 'cancelled'];
    
    const appointmentsToCreate: Array<{
      clinic_id: string;
      practitioner_id: string;
      patient_id: string;
      date: string;
      start_time: string;
      duration_minutes: number;
      status: 'scheduled' | 'completed' | 'cancelled';
      sub_slot: number;
      mode: 'in_person';
    }> = [];

    // Create 30 appointments distributed across the week
    for (let i = 0; i < 30; i++) {
      const dayOffset = i % 5; // Monday to Friday (0-4)
      const appointmentDate = format(addDays(weekStart, dayOffset), 'yyyy-MM-dd');
      const timeIndex = Math.floor(i / 5) % APPOINTMENT_TIMES.length;
      const practitionerIndex = i % allPractitioners.length;
      const patientIndex = i % allPatients.length;
      const statusIndex = i % statuses.length;

      appointmentsToCreate.push({
        clinic_id: clinicId,
        practitioner_id: allPractitioners[practitionerIndex].id,
        patient_id: allPatients[patientIndex].id,
        date: appointmentDate,
        start_time: APPOINTMENT_TIMES[timeIndex],
        duration_minutes: 30,
        status: statuses[statusIndex],
        sub_slot: 1,
        mode: 'in_person',
      });
    }

    // Check for existing appointments to avoid duplicates
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('id, date, start_time, practitioner_id')
      .eq('clinic_id', clinicId)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(addDays(weekStart, 4), 'yyyy-MM-dd'));

    const existingKeys = new Set(
      (existingAppointments || []).map(a => `${a.date}-${a.start_time}-${a.practitioner_id}`)
    );

    const newAppointments = appointmentsToCreate.filter(
      a => !existingKeys.has(`${a.date}-${a.start_time}-${a.practitioner_id}`)
    );

    let insertedAppointments = 0;
    if (newAppointments.length > 0) {
      const { data: createdAppointments, error: appointmentError } = await supabase
        .from('appointments')
        .insert(newAppointments)
        .select('id');

      if (appointmentError) throw new Error(`Error creating appointments: ${appointmentError.message}`);
      insertedAppointments = createdAppointments?.length || 0;
    }

    return {
      success: true,
      clinicId,
      counts: {
        patients: insertedPatients,
        practitioners: insertedPractitioners,
        appointments: insertedAppointments,
      },
    };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return {
      success: false,
      counts: { patients: 0, practitioners: 0, appointments: 0 },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const clearDemoData = async (): Promise<ClearResult> => {
  try {
    // 1. Find the demo clinic
    const { data: demoClinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('name', DEMO_CLINIC_NAME)
      .maybeSingle();

    if (!demoClinic) {
      return {
        success: true,
        counts: { appointments: 0, patients: 0, practitioners: 0 },
      };
    }

    const clinicId = demoClinic.id;

    // 2. Delete in order to respect FK constraints

    // Delete appointments first
    const { data: deletedAppointments } = await supabase
      .from('appointments')
      .delete()
      .eq('clinic_id', clinicId)
      .select('id');

    // Delete patients
    const { data: deletedPatients } = await supabase
      .from('patients')
      .delete()
      .eq('clinic_id', clinicId)
      .select('id');

    // Delete practitioners
    const { data: deletedPractitioners } = await supabase
      .from('practitioners')
      .delete()
      .eq('clinic_id', clinicId)
      .select('id');

    // Delete user_roles for this clinic
    await supabase
      .from('user_roles')
      .delete()
      .eq('clinic_id', clinicId);

    // Delete clinic_settings
    await supabase
      .from('clinic_settings')
      .delete()
      .eq('clinic_id', clinicId);

    // Delete the clinic itself
    await supabase
      .from('clinics')
      .delete()
      .eq('id', clinicId);

    return {
      success: true,
      counts: {
        appointments: deletedAppointments?.length || 0,
        patients: deletedPatients?.length || 0,
        practitioners: deletedPractitioners?.length || 0,
      },
    };
  } catch (error) {
    console.error('Error clearing demo data:', error);
    return {
      success: false,
      counts: { appointments: 0, patients: 0, practitioners: 0 },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const getDemoClinicId = async (): Promise<string | null> => {
  const { data } = await supabase
    .from('clinics')
    .select('id')
    .eq('name', DEMO_CLINIC_NAME)
    .maybeSingle();
  
  return data?.id || null;
};
