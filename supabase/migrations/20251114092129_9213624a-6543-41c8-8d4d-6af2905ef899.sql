-- =====================================================
-- Schema SQL para App SaaS Multi-Clínica
-- Gestión de Agenda Médica (Kinesiología y más)
-- =====================================================

-- =====================================================
-- 1. CLÍNICAS, USUARIOS Y ROLES
-- =====================================================

-- Tabla: clinics
CREATE TABLE clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code text,
  timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  default_locale text DEFAULT 'es',
  default_currency text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: clinic_settings
CREATE TABLE clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  min_slot_minutes int DEFAULT 30,
  workday_start time DEFAULT '08:00'::time,
  workday_end time DEFAULT '19:00'::time,
  allow_professional_self_block bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  locale text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: roles
CREATE TABLE roles (
  id text PRIMARY KEY,
  description text
);

-- Tabla: user_roles
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_clinic_id ON user_roles(clinic_id);

-- =====================================================
-- 2. PROFESIONALES Y DISPONIBILIDAD
-- =====================================================

-- Tabla: practitioners
CREATE TABLE practitioners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  prefix text,
  color text,
  specialties text[],
  is_active bool DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_practitioners_clinic_active ON practitioners(clinic_id, is_active);

-- Tabla: practitioner_availability
CREATE TABLE practitioner_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  from_time time NOT NULL,
  to_time time NOT NULL,
  slot_minutes int DEFAULT 30,
  capacity int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (from_time < to_time)
);

CREATE INDEX idx_availability_clinic_id ON practitioner_availability(clinic_id);
CREATE INDEX idx_availability_practitioner_id ON practitioner_availability(practitioner_id);

-- =====================================================
-- 3. PACIENTES, BANDERAS Y CAMPOS PERSONALIZADOS
-- =====================================================

-- Tabla: patients
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document_id text,
  email text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  is_deleted bool DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_patients_clinic_name ON patients(clinic_id, full_name);
CREATE INDEX idx_patients_clinic_document ON patients(clinic_id, document_id);

-- Tabla: patient_flag_definitions
CREATE TABLE patient_flag_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  description text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, code)
);

-- Tabla: patient_flags
CREATE TABLE patient_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  flag_definition_id uuid NOT NULL REFERENCES patient_flag_definitions(id) ON DELETE CASCADE,
  details text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_patient_flags_patient_id ON patient_flags(patient_id);

-- Tabla: patient_custom_fields
CREATE TABLE patient_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  field_key text NOT NULL,
  field_type text NOT NULL,
  is_required bool DEFAULT false,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, field_key)
);

-- Tabla: patient_custom_values
CREATE TABLE patient_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES patient_custom_fields(id) ON DELETE CASCADE,
  value_text text,
  value_number numeric,
  value_date date,
  value_bool bool,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_custom_values_patient_id ON patient_custom_values(patient_id);

-- Tabla: patient_clinical_notes
CREATE TABLE patient_clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  note_date date NOT NULL,
  title text,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clinical_notes_patient_id ON patient_clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_clinic_id ON patient_clinical_notes(clinic_id);

-- Tabla: patient_documents
CREATE TABLE patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text,
  description text,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);

-- =====================================================
-- 4. TRATAMIENTOS / SERVICIOS
-- =====================================================

-- Tabla: treatment_types
CREATE TABLE treatment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_duration_minutes int NOT NULL,
  color text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_treatment_types_clinic_id ON treatment_types(clinic_id);

-- =====================================================
-- 5. CITAS Y ESTADO DE TURNOS
-- =====================================================

-- Tipos ENUM: appointment_status y appointment_mode
CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE appointment_mode AS ENUM (
  'in_person',
  'virtual',
  'home_visit'
);

-- Tabla: appointments
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  treatment_type_id uuid REFERENCES treatment_types(id) ON DELETE SET NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes int NOT NULL,
  sub_slot smallint NOT NULL DEFAULT 1,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  mode appointment_mode NOT NULL DEFAULT 'in_person',
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (start_time >= '00:00'::time),
  CHECK (start_time <= '23:59'::time),
  UNIQUE (clinic_id, practitioner_id, date, start_time, sub_slot)
);

CREATE INDEX idx_appointments_clinic_pract_date ON appointments(clinic_id, practitioner_id, date);
CREATE INDEX idx_appointments_clinic_patient_date ON appointments(clinic_id, patient_id, date);

-- Tabla: appointment_status_history
CREATE TABLE appointment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  old_status appointment_status,
  new_status appointment_status,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_status_history_appointment_id ON appointment_status_history(appointment_id);

-- =====================================================
-- 6. EXCEPCIONES, FERIADOS Y BLOQUEOS
-- =====================================================

-- Tabla: holiday_calendar
CREATE TABLE holiday_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  country_code text,
  date date NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_holiday_calendar_clinic_date ON holiday_calendar(clinic_id, date);
CREATE INDEX idx_holiday_calendar_country_date ON holiday_calendar(country_code, date);

-- Tabla: schedule_exceptions
CREATE TABLE schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  practitioner_id uuid REFERENCES practitioners(id) ON DELETE CASCADE,
  date date NOT NULL,
  from_time time,
  to_time time,
  reason text,
  type text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (from_time IS NULL AND to_time IS NULL)
    OR
    (from_time IS NOT NULL AND to_time IS NOT NULL)
  )
);

CREATE INDEX idx_exceptions_clinic_date ON schedule_exceptions(clinic_id, date);
CREATE INDEX idx_exceptions_practitioner_date ON schedule_exceptions(practitioner_id, date);

-- =====================================================
-- 7. AUDITORÍA
-- =====================================================

-- Tabla: audit_log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_clinic_id ON audit_log(clinic_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- =====================================================
-- 8. DATOS INICIALES
-- =====================================================

-- Insertar roles base
INSERT INTO roles (id, description) VALUES
('admin_clinic', 'Administrador de la clínica'),
('receptionist', 'Recepcionista'),
('health_pro', 'Profesional de la salud')
ON CONFLICT DO NOTHING;