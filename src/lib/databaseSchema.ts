/**
 * Complete Database Schema for Kinesiología App
 * This file contains the full SQL DDL for backup/restoration purposes
 */

export const getDatabaseSchemaSQL = (): string => {
  const timestamp = new Date().toISOString();
  
  return `-- =============================================
-- KINESIOLOGÍA APP - DATABASE SCHEMA BACKUP
-- Generated: ${timestamp}
-- PostgreSQL / Supabase Compatible
-- =============================================

-- =============================================
-- SECTION 1: ENUMS
-- =============================================

CREATE TYPE public.appointment_mode AS ENUM (
    'in_person',
    'virtual',
    'home_visit'
);

CREATE TYPE public.appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);

-- =============================================
-- SECTION 2: TABLES
-- =============================================

-- Table: roles
CREATE TABLE public.roles (
    id text NOT NULL PRIMARY KEY,
    description text
);

-- Initial data for roles
INSERT INTO public.roles (id, description) VALUES
    ('tenant_owner', 'Owner of the tenant/organization'),
    ('admin_clinic', 'Administrator of a clinic'),
    ('receptionist', 'Receptionist staff'),
    ('health_pro', 'Health professional/practitioner');

-- Table: clinics
CREATE TABLE public.clinics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    country_code text,
    timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires'::text,
    default_locale text DEFAULT 'es'::text,
    default_currency text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: users
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text,
    locale text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: user_roles
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    role_id text NOT NULL REFERENCES public.roles(id),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: clinic_settings
CREATE TABLE public.clinic_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL UNIQUE REFERENCES public.clinics(id),
    min_slot_minutes integer DEFAULT 30,
    sub_slots_per_block integer NOT NULL DEFAULT 5,
    workday_start time without time zone DEFAULT '08:00:00'::time,
    workday_end time without time zone DEFAULT '19:00:00'::time,
    auto_mark_no_show boolean NOT NULL DEFAULT true,
    auto_mark_no_show_time time without time zone NOT NULL DEFAULT '00:00:00'::time,
    allow_professional_self_block boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: practitioners
CREATE TABLE public.practitioners (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    user_id uuid REFERENCES public.users(id),
    display_name text NOT NULL,
    prefix text,
    color text,
    specialties text[],
    notes text,
    phone text,
    email text,
    license_id text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: practitioner_availability
CREATE TABLE public.practitioner_availability (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    practitioner_id uuid NOT NULL REFERENCES public.practitioners(id),
    weekday smallint NOT NULL,
    from_time time without time zone NOT NULL,
    to_time time without time zone NOT NULL,
    slot_minutes integer DEFAULT 30,
    capacity integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT practitioner_availability_weekday_check CHECK ((weekday >= 0) AND (weekday <= 6))
);

-- Table: patients
CREATE TABLE public.patients (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    full_name text NOT NULL,
    preferred_name text,
    document_id text,
    email text,
    phone text,
    date_of_birth date,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relationship text,
    obra_social text,
    numero_afiliado text,
    sesiones_autorizadas integer DEFAULT 0,
    copago numeric DEFAULT 0,
    reminder_preference text DEFAULT 'none'::text,
    contact_auth_whatsapp boolean DEFAULT false,
    contact_auth_email boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: patient_flag_definitions
CREATE TABLE public.patient_flag_definitions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    code text NOT NULL,
    label text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: patient_flags
CREATE TABLE public.patient_flags (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id),
    flag_definition_id uuid NOT NULL REFERENCES public.patient_flag_definitions(id),
    details text,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: patient_custom_fields
CREATE TABLE public.patient_custom_fields (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    field_key text NOT NULL,
    field_type text NOT NULL,
    name text NOT NULL,
    is_required boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: patient_custom_values
CREATE TABLE public.patient_custom_values (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id),
    field_id uuid NOT NULL REFERENCES public.patient_custom_fields(id),
    value_text text,
    value_number numeric,
    value_date date,
    value_bool boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: patient_clinical_notes
CREATE TABLE public.patient_clinical_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id),
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    practitioner_id uuid REFERENCES public.practitioners(id),
    appointment_id uuid,
    note_date date NOT NULL,
    start_time time without time zone,
    note_type text NOT NULL DEFAULT 'evolution'::text,
    title text,
    body text NOT NULL,
    treatment_type text,
    clinical_data jsonb,
    status text DEFAULT 'active'::text,
    is_completed boolean DEFAULT false,
    created_by uuid REFERENCES public.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: patient_documents
CREATE TABLE public.patient_documents (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id),
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    file_url text NOT NULL,
    file_type text,
    description text,
    uploaded_by uuid REFERENCES public.users(id),
    uploaded_at timestamp with time zone DEFAULT now()
);

-- Table: treatment_types
CREATE TABLE public.treatment_types (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    name text NOT NULL,
    default_duration_minutes integer NOT NULL,
    color text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: appointments
CREATE TABLE public.appointments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    practitioner_id uuid NOT NULL REFERENCES public.practitioners(id),
    patient_id uuid REFERENCES public.patients(id),
    treatment_type_id uuid REFERENCES public.treatment_types(id),
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    sub_slot smallint NOT NULL DEFAULT 1,
    status public.appointment_status NOT NULL DEFAULT 'scheduled'::appointment_status,
    mode public.appointment_mode NOT NULL DEFAULT 'in_person'::appointment_mode,
    notes text,
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add foreign key for clinical_notes -> appointments (after appointments table exists)
ALTER TABLE public.patient_clinical_notes 
    ADD CONSTRAINT patient_clinical_notes_appointment_id_fkey 
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);

-- Table: appointment_status_history
CREATE TABLE public.appointment_status_history (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id uuid NOT NULL REFERENCES public.appointments(id),
    old_status public.appointment_status,
    new_status public.appointment_status,
    changed_by uuid REFERENCES public.users(id),
    changed_at timestamp with time zone DEFAULT now()
);

-- Table: schedule_exceptions
CREATE TABLE public.schedule_exceptions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id),
    practitioner_id uuid REFERENCES public.practitioners(id),
    date date NOT NULL,
    from_time time without time zone,
    to_time time without time zone,
    type text NOT NULL,
    reason text,
    created_by uuid REFERENCES public.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: holiday_calendar
CREATE TABLE public.holiday_calendar (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid REFERENCES public.clinics(id),
    date date NOT NULL,
    name text NOT NULL,
    country_code text,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: audit_log
CREATE TABLE public.audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid REFERENCES public.clinics(id),
    user_id uuid REFERENCES public.users(id),
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- SECTION 3: INDEXES
-- =============================================

CREATE INDEX idx_appointments_clinic_date ON public.appointments(clinic_id, date);
CREATE INDEX idx_appointments_practitioner_date ON public.appointments(practitioner_id, date);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_patients_clinic ON public.patients(clinic_id);
CREATE INDEX idx_patients_full_name ON public.patients(full_name);
CREATE INDEX idx_practitioners_clinic ON public.practitioners(clinic_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_clinic ON public.user_roles(clinic_id);
CREATE INDEX idx_clinical_notes_patient ON public.patient_clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_date ON public.patient_clinical_notes(note_date);
CREATE INDEX idx_schedule_exceptions_clinic_date ON public.schedule_exceptions(clinic_id, date);
CREATE INDEX idx_practitioner_availability_practitioner ON public.practitioner_availability(practitioner_id);

-- =============================================
-- SECTION 4: FUNCTIONS
-- =============================================

-- Function: current_auth_user_id
CREATE OR REPLACE FUNCTION public.current_auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid();
$$;

-- Function: current_practitioner_id
CREATE OR REPLACE FUNCTION public.current_practitioner_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id
  FROM public.practitioners p
  JOIN public.users u ON p.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
    AND p.is_active = true
  LIMIT 1;
$$;

-- Function: is_tenant_owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role_id = 'tenant_owner'
      AND ur.active = true
  );
$$;

-- Function: is_admin_clinic
CREATE OR REPLACE FUNCTION public.is_admin_clinic(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.clinic_id = target_clinic_id
      AND ur.role_id IN ('admin_clinic', 'tenant_owner')
      AND ur.active = true
  );
$$;

-- Function: is_receptionist
CREATE OR REPLACE FUNCTION public.is_receptionist(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- Function: is_health_pro
CREATE OR REPLACE FUNCTION public.is_health_pro(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- Function: can_view_user
CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = target_user_id 
    AND auth_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.user_roles ur1
    JOIN public.users u ON ur1.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND ur1.role_id IN ('admin_clinic', 'tenant_owner')
    AND ur1.active = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = target_user_id
      AND ur2.clinic_id = ur1.clinic_id
    )
  );
$$;

-- Function: create_clinic_onboarding
CREATE OR REPLACE FUNCTION public.create_clinic_onboarding(
    p_name text,
    p_country_code text DEFAULT NULL,
    p_timezone text DEFAULT 'America/Argentina/Buenos_Aires',
    p_default_currency text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auth_user_id UUID;
  v_user_id UUID;
  v_clinic_id UUID;
  v_has_roles BOOLEAN;
BEGIN
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = v_auth_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en public.users';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id
  ) INTO v_has_roles;

  IF v_has_roles THEN
    RAISE EXCEPTION 'Usuario ya tiene roles asignados.';
  END IF;

  INSERT INTO public.clinics (name, country_code, timezone, default_currency)
  VALUES (p_name, p_country_code, p_timezone, p_default_currency)
  RETURNING id INTO v_clinic_id;

  INSERT INTO public.clinic_settings (
    clinic_id, min_slot_minutes, workday_start, workday_end,
    auto_mark_no_show, auto_mark_no_show_time, allow_professional_self_block
  ) VALUES (
    v_clinic_id, 30, '08:00:00', '19:00:00', true, '00:00:00', true
  );

  INSERT INTO public.user_roles (user_id, clinic_id, role_id, active)
  VALUES (v_user_id, v_clinic_id, 'tenant_owner', true);

  RETURN v_clinic_id;
END;
$$;

-- Function: sync_auth_user
CREATE OR REPLACE FUNCTION public.sync_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.users
  SET auth_user_id = NEW.id,
      updated_at = now()
  WHERE email = NEW.email
    AND auth_user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Function: auto_mark_no_show
CREATE OR REPLACE FUNCTION public.auto_mark_no_show()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE appointments
  SET 
    status = 'no_show',
    updated_at = now()
  WHERE 
    status = 'scheduled'
    AND date < CURRENT_DATE;
    
  RAISE NOTICE 'auto_mark_no_show executed successfully';
END;
$$;

-- =============================================
-- SECTION 5: TRIGGERS
-- =============================================

-- Trigger: sync_auth_user on auth.users (Note: Must be created in auth schema)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user();

-- =============================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: clinics
-- =============================================

CREATE POLICY "clinics_admin_owner_full_access" ON public.clinics
    FOR ALL USING (is_admin_clinic(id) OR is_tenant_owner());

-- =============================================
-- RLS Policies: users
-- =============================================

CREATE POLICY "users_read_own_record" ON public.users
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "users_can_view_allowed" ON public.users
    FOR SELECT USING (can_view_user(id));

-- =============================================
-- RLS Policies: roles
-- =============================================

CREATE POLICY "roles_authenticated_read" ON public.roles
    FOR SELECT USING (true);

-- =============================================
-- RLS Policies: user_roles
-- =============================================

CREATE POLICY "user_roles_admin_full_access" ON public.user_roles
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "user_roles_user_view_own" ON public.user_roles
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- =============================================
-- RLS Policies: clinic_settings
-- =============================================

CREATE POLICY "clinic_settings_admin_full_access" ON public.clinic_settings
    FOR ALL USING (is_admin_clinic(clinic_id));

-- =============================================
-- RLS Policies: practitioners
-- =============================================

CREATE POLICY "practitioners_admin_recep_view" ON public.practitioners
    FOR SELECT USING (is_admin_clinic(clinic_id) OR is_receptionist(clinic_id) OR is_health_pro(clinic_id));

CREATE POLICY "practitioners_admin_insert" ON public.practitioners
    FOR INSERT WITH CHECK (is_admin_clinic(clinic_id));

CREATE POLICY "practitioners_admin_update" ON public.practitioners
    FOR UPDATE USING (is_admin_clinic(clinic_id));

CREATE POLICY "practitioners_admin_delete" ON public.practitioners
    FOR DELETE USING (is_admin_clinic(clinic_id));

-- =============================================
-- RLS Policies: practitioner_availability
-- =============================================

CREATE POLICY "availability_admin_recep_view" ON public.practitioner_availability
    FOR SELECT USING (is_admin_clinic(clinic_id) OR is_receptionist(clinic_id) OR is_health_pro(clinic_id));

CREATE POLICY "availability_admin_modify" ON public.practitioner_availability
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "availability_pro_manage_own" ON public.practitioner_availability
    FOR ALL USING (practitioner_id = current_practitioner_id());

-- =============================================
-- RLS Policies: patients
-- =============================================

CREATE POLICY "patients_admin_full_access" ON public.patients
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "patients_recep_view" ON public.patients
    FOR SELECT USING (is_receptionist(clinic_id));

CREATE POLICY "patients_recep_insert" ON public.patients
    FOR INSERT WITH CHECK (is_receptionist(clinic_id));

CREATE POLICY "patients_recep_update" ON public.patients
    FOR UPDATE USING (is_receptionist(clinic_id));

CREATE POLICY "patients_pro_view_assigned" ON public.patients
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM appointments a WHERE a.patient_id = patients.id AND a.practitioner_id = current_practitioner_id()
    ));

-- =============================================
-- RLS Policies: patient_flag_definitions
-- =============================================

CREATE POLICY "flag_defs_admin_full_access" ON public.patient_flag_definitions
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "flag_defs_staff_read" ON public.patient_flag_definitions
    FOR SELECT USING (is_receptionist(clinic_id) OR is_health_pro(clinic_id));

-- =============================================
-- RLS Policies: patient_flags
-- =============================================

CREATE POLICY "patient_flags_admin_full_access" ON public.patient_flags
    FOR ALL USING (EXISTS (
        SELECT 1 FROM patients p WHERE p.id = patient_flags.patient_id AND is_admin_clinic(p.clinic_id)
    ));

CREATE POLICY "patient_flags_recep_view" ON public.patient_flags
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM patients p WHERE p.id = patient_flags.patient_id AND is_receptionist(p.clinic_id)
    ));

CREATE POLICY "patient_flags_pro_view_assigned" ON public.patient_flags
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM patients p
        JOIN appointments a ON a.patient_id = p.id
        WHERE patient_flags.patient_id = p.id AND a.practitioner_id = current_practitioner_id()
    ));

-- =============================================
-- RLS Policies: patient_custom_fields
-- =============================================

CREATE POLICY "custom_fields_admin_full_access" ON public.patient_custom_fields
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "custom_fields_staff_read" ON public.patient_custom_fields
    FOR SELECT USING (is_receptionist(clinic_id) OR is_health_pro(clinic_id));

-- =============================================
-- RLS Policies: patient_custom_values
-- =============================================

CREATE POLICY "custom_values_admin_full_access" ON public.patient_custom_values
    FOR ALL USING (EXISTS (
        SELECT 1 FROM patients p WHERE p.id = patient_custom_values.patient_id AND is_admin_clinic(p.clinic_id)
    ));

CREATE POLICY "custom_values_recep_manage" ON public.patient_custom_values
    FOR ALL USING (EXISTS (
        SELECT 1 FROM patients p WHERE p.id = patient_custom_values.patient_id AND is_receptionist(p.clinic_id)
    ));

CREATE POLICY "custom_values_pro_manage_assigned" ON public.patient_custom_values
    FOR ALL USING (EXISTS (
        SELECT 1 FROM patients p
        JOIN appointments a ON a.patient_id = p.id
        WHERE patient_custom_values.patient_id = p.id AND a.practitioner_id = current_practitioner_id()
    ));

-- =============================================
-- RLS Policies: patient_clinical_notes
-- =============================================

CREATE POLICY "clinical_notes_admin_full_access" ON public.patient_clinical_notes
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "clinical_notes_recep_view" ON public.patient_clinical_notes
    FOR SELECT USING (is_receptionist(clinic_id));

CREATE POLICY "clinical_notes_pro_view_assigned" ON public.patient_clinical_notes
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM appointments a WHERE a.patient_id = patient_clinical_notes.patient_id AND a.practitioner_id = current_practitioner_id()
    ));

CREATE POLICY "clinical_notes_pro_insert_assigned" ON public.patient_clinical_notes
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM appointments a WHERE a.patient_id = patient_clinical_notes.patient_id AND a.practitioner_id = current_practitioner_id()
    ));

CREATE POLICY "clinical_notes_pro_update_assigned" ON public.patient_clinical_notes
    FOR UPDATE USING (
        created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM appointments a WHERE a.patient_id = patient_clinical_notes.patient_id AND a.practitioner_id = current_practitioner_id()
        )
    );

-- =============================================
-- RLS Policies: patient_documents
-- =============================================

CREATE POLICY "documents_admin_full_access" ON public.patient_documents
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "documents_recep_view" ON public.patient_documents
    FOR SELECT USING (is_receptionist(clinic_id));

CREATE POLICY "documents_pro_view_assigned" ON public.patient_documents
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM appointments a WHERE a.patient_id = patient_documents.patient_id AND a.practitioner_id = current_practitioner_id()
    ));

-- =============================================
-- RLS Policies: treatment_types
-- =============================================

CREATE POLICY "treatment_types_admin_full_access" ON public.treatment_types
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "treatment_types_staff_read" ON public.treatment_types
    FOR SELECT USING (is_receptionist(clinic_id) OR is_health_pro(clinic_id));

-- =============================================
-- RLS Policies: appointments
-- =============================================

CREATE POLICY "appointments_admin_full_access" ON public.appointments
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "appointments_recep_full_access" ON public.appointments
    FOR ALL USING (is_receptionist(clinic_id));

CREATE POLICY "appointments_pro_view_own" ON public.appointments
    FOR SELECT USING (practitioner_id = current_practitioner_id());

CREATE POLICY "appointments_pro_update_own" ON public.appointments
    FOR UPDATE USING (practitioner_id = current_practitioner_id());

-- =============================================
-- RLS Policies: appointment_status_history
-- =============================================

CREATE POLICY "appt_history_admin_full_access" ON public.appointment_status_history
    FOR ALL USING (EXISTS (
        SELECT 1 FROM appointments a WHERE a.id = appointment_status_history.appointment_id AND is_admin_clinic(a.clinic_id)
    ));

CREATE POLICY "appt_history_recep_view" ON public.appointment_status_history
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM appointments a WHERE a.id = appointment_status_history.appointment_id AND is_receptionist(a.clinic_id)
    ));

CREATE POLICY "appt_history_pro_view_own" ON public.appointment_status_history
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM appointments a WHERE a.id = appointment_status_history.appointment_id AND a.practitioner_id = current_practitioner_id()
    ));

-- =============================================
-- RLS Policies: schedule_exceptions
-- =============================================

CREATE POLICY "exceptions_admin_full_access" ON public.schedule_exceptions
    FOR ALL USING (is_admin_clinic(clinic_id));

CREATE POLICY "exceptions_recep_view" ON public.schedule_exceptions
    FOR SELECT USING (is_receptionist(clinic_id));

CREATE POLICY "exceptions_pro_manage_own" ON public.schedule_exceptions
    FOR ALL USING (
        practitioner_id = current_practitioner_id()
        OR (practitioner_id IS NULL AND is_health_pro(clinic_id))
    );

-- =============================================
-- RLS Policies: holiday_calendar
-- =============================================

CREATE POLICY "holidays_admin_full_access" ON public.holiday_calendar
    FOR ALL USING (clinic_id IS NULL OR is_admin_clinic(clinic_id));

CREATE POLICY "holidays_staff_read" ON public.holiday_calendar
    FOR SELECT USING (clinic_id IS NULL OR is_receptionist(clinic_id) OR is_health_pro(clinic_id));

-- =============================================
-- RLS Policies: audit_log
-- =============================================

CREATE POLICY "audit_log_admin_read" ON public.audit_log
    FOR SELECT USING (clinic_id IS NULL OR is_admin_clinic(clinic_id));

-- =============================================
-- SECTION 7: STORAGE BUCKETS
-- =============================================

-- Note: Storage buckets are configured via Supabase Dashboard
-- Bucket: patient-documents (private)

-- =============================================
-- END OF SCHEMA
-- =============================================
`;
};
