import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

export interface ExportPayload {
  exported_at: string;
  export_source: string;
  clinic: any;
  clinic_settings: any;
  patients: any[];
  practitioners: any[];
  practitioner_availability: any[];
  treatment_types: any[];
  practitioner_treatments: any[];
  appointments: any[];
  patient_clinical_notes: any[];
  patient_documents: any[];
  schedule_exceptions: any[];
  holiday_calendar: any[];
  users: any[];
  user_roles: any[];
  totals: Record<string, number>;
}

export async function buildClinicExport(
  supabaseAdmin: SupabaseClient,
  clinicId: string,
  source: string = 'manual'
): Promise<ExportPayload> {
  const [
    clinicRes,
    settingsRes,
    patientsRes,
    practitionersRes,
    availabilityRes,
    treatmentTypesRes,
    practTreatmentsRes,
    appointmentsRes,
    clinicalNotesRes,
    documentsRes,
    exceptionsRes,
    holidaysRes,
    userRolesRes,
  ] = await Promise.all([
    supabaseAdmin.from('clinics').select('*').eq('id', clinicId).single(),
    supabaseAdmin.from('clinic_settings').select('*').eq('clinic_id', clinicId).maybeSingle(),
    supabaseAdmin.from('patients').select('*').eq('clinic_id', clinicId).eq('is_deleted', false),
    supabaseAdmin.from('practitioners').select('*').eq('clinic_id', clinicId),
    supabaseAdmin.from('practitioner_availability').select('*').eq('clinic_id', clinicId),
    supabaseAdmin.from('treatment_types').select('*').eq('clinic_id', clinicId),
    supabaseAdmin.from('practitioner_treatments').select('*').eq('clinic_id', clinicId),
    supabaseAdmin.from('appointments').select('*').eq('clinic_id', clinicId),
    supabaseAdmin.from('patient_clinical_notes').select('*').eq('clinic_id', clinicId),
    // Documents: only metadata, exclude file_url
    supabaseAdmin.from('patient_documents').select('id, patient_id, clinic_id, file_type, description, uploaded_at, uploaded_by').eq('clinic_id', clinicId),
    supabaseAdmin.from('schedule_exceptions').select('*').eq('clinic_id', clinicId),
    supabaseAdmin.from('holiday_calendar').select('*').eq('clinic_id', clinicId),
    supabaseAdmin.from('user_roles').select('id, user_id, role_id, clinic_id, active, created_at').eq('clinic_id', clinicId),
  ]);

  // Get user IDs from user_roles to fetch user details (sanitized)
  const userIds = [...new Set((userRolesRes.data || []).map((r: any) => r.user_id))];
  let usersData: any[] = [];
  if (userIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, phone, is_active, created_at')
      .in('id', userIds);
    usersData = data || [];
  }

  return {
    exported_at: new Date().toISOString(),
    export_source: source,
    clinic: clinicRes.data,
    clinic_settings: settingsRes.data,
    patients: patientsRes.data || [],
    practitioners: practitionersRes.data || [],
    practitioner_availability: availabilityRes.data || [],
    treatment_types: treatmentTypesRes.data || [],
    practitioner_treatments: practTreatmentsRes.data || [],
    appointments: appointmentsRes.data || [],
    patient_clinical_notes: clinicalNotesRes.data || [],
    patient_documents: documentsRes.data || [],
    schedule_exceptions: exceptionsRes.data || [],
    holiday_calendar: holidaysRes.data || [],
    users: usersData,
    user_roles: userRolesRes.data || [],
    totals: {
      patients: (patientsRes.data || []).length,
      practitioners: (practitionersRes.data || []).length,
      appointments: (appointmentsRes.data || []).length,
      clinical_notes: (clinicalNotesRes.data || []).length,
      documents: (documentsRes.data || []).length,
      treatment_types: (treatmentTypesRes.data || []).length,
      users: usersData.length,
    },
  };
}
