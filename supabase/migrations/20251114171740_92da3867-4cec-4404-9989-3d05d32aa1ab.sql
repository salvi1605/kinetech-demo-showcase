-- ============================
-- MIGRACIÓN: Row Level Security (RLS) para Sistema de Kinesiología Multi-Clínica
-- ============================
-- Esta migración configura todas las políticas de seguridad a nivel de fila
-- para proteger los datos según el rol del usuario (admin_clinic, receptionist, health_pro)

BEGIN;

-- ============================
-- 1) FUNCIONES AUXILIARES DE SEGURIDAD
-- ============================
-- Estas funciones evitan recursión en RLS usando SECURITY DEFINER

-- Obtener el user_id de auth (Supabase auth.uid())
CREATE OR REPLACE FUNCTION public.current_auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- Verificar si el usuario autenticado es admin_clinic de una clínica específica
CREATE OR REPLACE FUNCTION public.is_admin_clinic(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.clinic_id = target_clinic_id
      AND ur.role_id = 'admin_clinic'
      AND ur.active = true
  );
$$;

-- Verificar si el usuario autenticado es receptionist de una clínica específica
CREATE OR REPLACE FUNCTION public.is_receptionist(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.clinic_id = target_clinic_id
      AND ur.role_id = 'receptionist'
      AND ur.active = true
  );
$$;

-- Verificar si el usuario autenticado es health_pro de una clínica específica
CREATE OR REPLACE FUNCTION public.is_health_pro(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.clinic_id = target_clinic_id
      AND ur.role_id = 'health_pro'
      AND ur.active = true
  );
$$;

-- Obtener el practitioner_id del usuario autenticado (si existe)
CREATE OR REPLACE FUNCTION public.current_practitioner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.practitioners p
  JOIN public.users u ON p.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
    AND p.is_active = true
  LIMIT 1;
$$;


-- ============================
-- 2) HABILITAR RLS EN TODAS LAS TABLAS
-- ============================

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_flag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_custom_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;


-- ============================
-- 3) POLÍTICAS DE RLS POR TABLA
-- ============================

-- -------- clinics --------
-- Admin de la clínica: acceso completo
DROP POLICY IF EXISTS "clinics_admin_full_access" ON public.clinics;
CREATE POLICY "clinics_admin_full_access" ON public.clinics
FOR ALL
USING (public.is_admin_clinic(id));

-- -------- clinic_settings --------
-- Admin de la clínica: acceso completo
DROP POLICY IF EXISTS "clinic_settings_admin_full_access" ON public.clinic_settings;
CREATE POLICY "clinic_settings_admin_full_access" ON public.clinic_settings
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- -------- users --------
-- Admin puede ver usuarios de su clínica (a través de user_roles)
DROP POLICY IF EXISTS "users_admin_can_view" ON public.users;
CREATE POLICY "users_admin_can_view" ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = users.id
      AND public.is_admin_clinic(ur.clinic_id)
  )
);

-- Usuario puede ver su propio registro
DROP POLICY IF EXISTS "users_can_view_self" ON public.users;
CREATE POLICY "users_can_view_self" ON public.users
FOR SELECT
USING (auth_user_id = auth.uid());

-- -------- roles --------
-- Roles son de solo lectura para usuarios autenticados
DROP POLICY IF EXISTS "roles_authenticated_read" ON public.roles;
CREATE POLICY "roles_authenticated_read" ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- -------- user_roles --------
-- Admin de la clínica: acceso completo a roles de su clínica
DROP POLICY IF EXISTS "user_roles_admin_full_access" ON public.user_roles;
CREATE POLICY "user_roles_admin_full_access" ON public.user_roles
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Usuario puede ver sus propios roles
DROP POLICY IF EXISTS "user_roles_user_view_own" ON public.user_roles;
CREATE POLICY "user_roles_user_view_own" ON public.user_roles
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- -------- practitioners --------
-- Admin, recepcionista y profesionales: pueden ver todos los profesionales de su clínica
DROP POLICY IF EXISTS "practitioners_admin_recep_view" ON public.practitioners;
CREATE POLICY "practitioners_admin_recep_view" ON public.practitioners
FOR SELECT
USING (
  public.is_admin_clinic(clinic_id)
  OR public.is_receptionist(clinic_id)
  OR public.is_health_pro(clinic_id)
);

-- Admin: puede crear profesionales
DROP POLICY IF EXISTS "practitioners_admin_insert" ON public.practitioners;
CREATE POLICY "practitioners_admin_insert" ON public.practitioners
FOR INSERT
WITH CHECK (public.is_admin_clinic(clinic_id));

-- Admin: puede modificar profesionales
DROP POLICY IF EXISTS "practitioners_admin_update" ON public.practitioners;
CREATE POLICY "practitioners_admin_update" ON public.practitioners
FOR UPDATE
USING (public.is_admin_clinic(clinic_id));

-- Admin: puede eliminar profesionales
DROP POLICY IF EXISTS "practitioners_admin_delete" ON public.practitioners;
CREATE POLICY "practitioners_admin_delete" ON public.practitioners
FOR DELETE
USING (public.is_admin_clinic(clinic_id));

-- -------- practitioner_availability --------
-- Admin, recepcionista y profesionales: ver disponibilidad
DROP POLICY IF EXISTS "availability_admin_recep_view" ON public.practitioner_availability;
CREATE POLICY "availability_admin_recep_view" ON public.practitioner_availability
FOR SELECT
USING (
  public.is_admin_clinic(clinic_id)
  OR public.is_receptionist(clinic_id)
  OR public.is_health_pro(clinic_id)
);

-- Admin: modificar cualquier disponibilidad
DROP POLICY IF EXISTS "availability_admin_modify" ON public.practitioner_availability;
CREATE POLICY "availability_admin_modify" ON public.practitioner_availability
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Profesional: gestionar su propia disponibilidad
-- Nota: La restricción de allow_professional_self_block debe verificarse en la aplicación
DROP POLICY IF EXISTS "availability_pro_manage_own" ON public.practitioner_availability;
CREATE POLICY "availability_pro_manage_own" ON public.practitioner_availability
FOR ALL
USING (practitioner_id = public.current_practitioner_id());

-- -------- patients --------
-- Admin: acceso completo a pacientes de su clínica
DROP POLICY IF EXISTS "patients_admin_full_access" ON public.patients;
CREATE POLICY "patients_admin_full_access" ON public.patients
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Recepcionista: puede ver pacientes de su clínica
DROP POLICY IF EXISTS "patients_recep_view" ON public.patients;
CREATE POLICY "patients_recep_view" ON public.patients
FOR SELECT
USING (public.is_receptionist(clinic_id));

-- Recepcionista: puede crear pacientes
DROP POLICY IF EXISTS "patients_recep_insert" ON public.patients;
CREATE POLICY "patients_recep_insert" ON public.patients
FOR INSERT
WITH CHECK (public.is_receptionist(clinic_id));

-- Recepcionista: puede actualizar pacientes
DROP POLICY IF EXISTS "patients_recep_update" ON public.patients;
CREATE POLICY "patients_recep_update" ON public.patients
FOR UPDATE
USING (public.is_receptionist(clinic_id));

-- Profesional: ver solo pacientes con los que tiene citas
-- Nota: Un paciente está "asociado" al profesional si tiene al menos una cita con él
DROP POLICY IF EXISTS "patients_pro_view_assigned" ON public.patients;
CREATE POLICY "patients_pro_view_assigned" ON public.patients
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = patients.id
      AND a.practitioner_id = public.current_practitioner_id()
  )
);

-- -------- patient_flag_definitions --------
-- Admin: acceso completo
DROP POLICY IF EXISTS "flag_defs_admin_full_access" ON public.patient_flag_definitions;
CREATE POLICY "flag_defs_admin_full_access" ON public.patient_flag_definitions
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Recepcionista y profesional: solo lectura
DROP POLICY IF EXISTS "flag_defs_staff_read" ON public.patient_flag_definitions;
CREATE POLICY "flag_defs_staff_read" ON public.patient_flag_definitions
FOR SELECT
USING (
  public.is_receptionist(clinic_id)
  OR public.is_health_pro(clinic_id)
);

-- -------- patient_flags --------
-- Admin: acceso completo a flags de pacientes de su clínica
DROP POLICY IF EXISTS "patient_flags_admin_full_access" ON public.patient_flags;
CREATE POLICY "patient_flags_admin_full_access" ON public.patient_flags
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = patient_flags.patient_id
      AND public.is_admin_clinic(p.clinic_id)
  )
);

-- Profesional: ver flags de sus pacientes
DROP POLICY IF EXISTS "patient_flags_pro_view_assigned" ON public.patient_flags;
CREATE POLICY "patient_flags_pro_view_assigned" ON public.patient_flags
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    JOIN public.appointments a ON a.patient_id = p.id
    WHERE patient_flags.patient_id = p.id
      AND a.practitioner_id = public.current_practitioner_id()
  )
);

-- Recepcionista: ver flags de todos los pacientes de su clínica
DROP POLICY IF EXISTS "patient_flags_recep_view" ON public.patient_flags;
CREATE POLICY "patient_flags_recep_view" ON public.patient_flags
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = patient_flags.patient_id
      AND public.is_receptionist(p.clinic_id)
  )
);

-- -------- patient_custom_fields --------
-- Admin: acceso completo
DROP POLICY IF EXISTS "custom_fields_admin_full_access" ON public.patient_custom_fields;
CREATE POLICY "custom_fields_admin_full_access" ON public.patient_custom_fields
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Staff: solo lectura
DROP POLICY IF EXISTS "custom_fields_staff_read" ON public.patient_custom_fields;
CREATE POLICY "custom_fields_staff_read" ON public.patient_custom_fields
FOR SELECT
USING (
  public.is_receptionist(clinic_id)
  OR public.is_health_pro(clinic_id)
);

-- -------- patient_custom_values --------
-- Admin: acceso completo a valores de pacientes de su clínica
DROP POLICY IF EXISTS "custom_values_admin_full_access" ON public.patient_custom_values;
CREATE POLICY "custom_values_admin_full_access" ON public.patient_custom_values
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = patient_custom_values.patient_id
      AND public.is_admin_clinic(p.clinic_id)
  )
);

-- Profesional: acceso completo a valores de sus pacientes
DROP POLICY IF EXISTS "custom_values_pro_manage_assigned" ON public.patient_custom_values;
CREATE POLICY "custom_values_pro_manage_assigned" ON public.patient_custom_values
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    JOIN public.appointments a ON a.patient_id = p.id
    WHERE patient_custom_values.patient_id = p.id
      AND a.practitioner_id = public.current_practitioner_id()
  )
);

-- Recepcionista: puede ver y modificar valores
DROP POLICY IF EXISTS "custom_values_recep_manage" ON public.patient_custom_values;
CREATE POLICY "custom_values_recep_manage" ON public.patient_custom_values
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = patient_custom_values.patient_id
      AND public.is_receptionist(p.clinic_id)
  )
);

-- -------- patient_clinical_notes --------
-- Admin: acceso completo a notas de su clínica
DROP POLICY IF EXISTS "clinical_notes_admin_full_access" ON public.patient_clinical_notes;
CREATE POLICY "clinical_notes_admin_full_access" ON public.patient_clinical_notes
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Profesional: acceso completo solo a notas donde él es el practitioner
-- Nota: Un profesional solo puede crear/ver/editar sus propias notas clínicas
DROP POLICY IF EXISTS "clinical_notes_pro_manage_own" ON public.patient_clinical_notes;
CREATE POLICY "clinical_notes_pro_manage_own" ON public.patient_clinical_notes
FOR ALL
USING (practitioner_id = public.current_practitioner_id());

-- -------- patient_documents --------
-- Admin: acceso completo a documentos de su clínica
DROP POLICY IF EXISTS "documents_admin_full_access" ON public.patient_documents;
CREATE POLICY "documents_admin_full_access" ON public.patient_documents
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Profesional: ver documentos de sus pacientes
DROP POLICY IF EXISTS "documents_pro_view_assigned" ON public.patient_documents;
CREATE POLICY "documents_pro_view_assigned" ON public.patient_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.patient_id = patient_documents.patient_id
      AND a.practitioner_id = public.current_practitioner_id()
  )
);

-- Recepcionista: ver documentos de todos los pacientes de su clínica
DROP POLICY IF EXISTS "documents_recep_view" ON public.patient_documents;
CREATE POLICY "documents_recep_view" ON public.patient_documents
FOR SELECT
USING (public.is_receptionist(clinic_id));

-- -------- treatment_types --------
-- Admin: acceso completo
DROP POLICY IF EXISTS "treatment_types_admin_full_access" ON public.treatment_types;
CREATE POLICY "treatment_types_admin_full_access" ON public.treatment_types
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Recepcionista y profesional: solo lectura
DROP POLICY IF EXISTS "treatment_types_staff_read" ON public.treatment_types;
CREATE POLICY "treatment_types_staff_read" ON public.treatment_types
FOR SELECT
USING (
  public.is_receptionist(clinic_id)
  OR public.is_health_pro(clinic_id)
);

-- -------- appointments --------
-- Admin: acceso completo a citas de su clínica
DROP POLICY IF EXISTS "appointments_admin_full_access" ON public.appointments;
CREATE POLICY "appointments_admin_full_access" ON public.appointments
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Recepcionista: acceso completo operativo
DROP POLICY IF EXISTS "appointments_recep_full_access" ON public.appointments;
CREATE POLICY "appointments_recep_full_access" ON public.appointments
FOR ALL
USING (public.is_receptionist(clinic_id));

-- Profesional: ver sus propias citas
DROP POLICY IF EXISTS "appointments_pro_view_own" ON public.appointments;
CREATE POLICY "appointments_pro_view_own" ON public.appointments
FOR SELECT
USING (practitioner_id = public.current_practitioner_id());

-- Profesional: actualizar sus propias citas (status, notas)
DROP POLICY IF EXISTS "appointments_pro_update_own" ON public.appointments;
CREATE POLICY "appointments_pro_update_own" ON public.appointments
FOR UPDATE
USING (practitioner_id = public.current_practitioner_id());

-- -------- appointment_status_history --------
-- Admin: acceso completo al historial de su clínica
DROP POLICY IF EXISTS "appt_history_admin_full_access" ON public.appointment_status_history;
CREATE POLICY "appt_history_admin_full_access" ON public.appointment_status_history
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id = appointment_status_history.appointment_id
      AND public.is_admin_clinic(a.clinic_id)
  )
);

-- Profesional: ver historial de sus citas
DROP POLICY IF EXISTS "appt_history_pro_view_own" ON public.appointment_status_history;
CREATE POLICY "appt_history_pro_view_own" ON public.appointment_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id = appointment_status_history.appointment_id
      AND a.practitioner_id = public.current_practitioner_id()
  )
);

-- Recepcionista: ver historial de citas de su clínica
DROP POLICY IF EXISTS "appt_history_recep_view" ON public.appointment_status_history;
CREATE POLICY "appt_history_recep_view" ON public.appointment_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id = appointment_status_history.appointment_id
      AND public.is_receptionist(a.clinic_id)
  )
);

-- -------- holiday_calendar --------
-- Admin: acceso completo
-- Nota: clinic_id puede ser NULL para feriados nacionales
DROP POLICY IF EXISTS "holidays_admin_full_access" ON public.holiday_calendar;
CREATE POLICY "holidays_admin_full_access" ON public.holiday_calendar
FOR ALL
USING (
  clinic_id IS NULL
  OR public.is_admin_clinic(clinic_id)
);

-- Staff: solo lectura
DROP POLICY IF EXISTS "holidays_staff_read" ON public.holiday_calendar;
CREATE POLICY "holidays_staff_read" ON public.holiday_calendar
FOR SELECT
USING (
  clinic_id IS NULL
  OR public.is_receptionist(clinic_id)
  OR public.is_health_pro(clinic_id)
);

-- -------- schedule_exceptions --------
-- Admin: acceso completo a excepciones de su clínica
DROP POLICY IF EXISTS "exceptions_admin_full_access" ON public.schedule_exceptions;
CREATE POLICY "exceptions_admin_full_access" ON public.schedule_exceptions
FOR ALL
USING (public.is_admin_clinic(clinic_id));

-- Recepcionista: ver excepciones de su clínica
DROP POLICY IF EXISTS "exceptions_recep_view" ON public.schedule_exceptions;
CREATE POLICY "exceptions_recep_view" ON public.schedule_exceptions
FOR SELECT
USING (public.is_receptionist(clinic_id));

-- Profesional: gestionar solo sus propias excepciones (bloqueos personales)
-- Nota: practitioner_id puede ser NULL para excepciones globales de la clínica
DROP POLICY IF EXISTS "exceptions_pro_manage_own" ON public.schedule_exceptions;
CREATE POLICY "exceptions_pro_manage_own" ON public.schedule_exceptions
FOR ALL
USING (
  practitioner_id = public.current_practitioner_id()
  OR (
    practitioner_id IS NULL
    AND public.is_health_pro(clinic_id)
  )
);

-- -------- audit_log --------
-- Admin: solo lectura del audit log de su clínica
DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;
CREATE POLICY "audit_log_admin_read" ON public.audit_log
FOR SELECT
USING (
  clinic_id IS NULL
  OR public.is_admin_clinic(clinic_id)
);

-- Nota: Los INSERT al audit_log se harán generalmente desde triggers o servicios backend
-- Por eso no hay políticas de INSERT/UPDATE/DELETE para usuarios normales

COMMIT;