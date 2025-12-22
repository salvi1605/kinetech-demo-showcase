export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointment_status_history: {
        Row: {
          appointment_id: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["appointment_status"] | null
          old_status: Database["public"]["Enums"]["appointment_status"] | null
        }
        Insert: {
          appointment_id: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["appointment_status"] | null
          old_status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Update: {
          appointment_id?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["appointment_status"] | null
          old_status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          clinic_id: string
          created_at: string | null
          created_by: string | null
          date: string
          duration_minutes: number
          id: string
          mode: Database["public"]["Enums"]["appointment_mode"]
          notes: string | null
          patient_id: string | null
          practitioner_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          sub_slot: number
          treatment_type_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          date: string
          duration_minutes: number
          id?: string
          mode?: Database["public"]["Enums"]["appointment_mode"]
          notes?: string | null
          patient_id?: string | null
          practitioner_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          sub_slot?: number
          treatment_type_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          duration_minutes?: number
          id?: string
          mode?: Database["public"]["Enums"]["appointment_mode"]
          notes?: string | null
          patient_id?: string | null
          practitioner_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          sub_slot?: number
          treatment_type_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "treatment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          clinic_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          clinic_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          clinic_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          allow_professional_self_block: boolean | null
          auto_mark_no_show: boolean
          auto_mark_no_show_time: string
          clinic_id: string
          created_at: string | null
          id: string
          min_slot_minutes: number | null
          updated_at: string | null
          workday_end: string | null
          workday_start: string | null
        }
        Insert: {
          allow_professional_self_block?: boolean | null
          auto_mark_no_show?: boolean
          auto_mark_no_show_time?: string
          clinic_id: string
          created_at?: string | null
          id?: string
          min_slot_minutes?: number | null
          updated_at?: string | null
          workday_end?: string | null
          workday_start?: string | null
        }
        Update: {
          allow_professional_self_block?: boolean | null
          auto_mark_no_show?: boolean
          auto_mark_no_show_time?: string
          clinic_id?: string
          created_at?: string | null
          id?: string
          min_slot_minutes?: number | null
          updated_at?: string | null
          workday_end?: string | null
          workday_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          country_code: string | null
          created_at: string | null
          default_currency: string | null
          default_locale: string | null
          id: string
          is_active: boolean | null
          name: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          default_currency?: string | null
          default_locale?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          default_currency?: string | null
          default_locale?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      holiday_calendar: {
        Row: {
          clinic_id: string | null
          country_code: string | null
          created_at: string | null
          date: string
          id: string
          name: string
        }
        Insert: {
          clinic_id?: string | null
          country_code?: string | null
          created_at?: string | null
          date: string
          id?: string
          name: string
        }
        Update: {
          clinic_id?: string | null
          country_code?: string | null
          created_at?: string | null
          date?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_calendar_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinical_notes: {
        Row: {
          appointment_id: string | null
          body: string
          clinic_id: string
          clinical_data: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_completed: boolean | null
          note_date: string
          note_type: string
          patient_id: string
          practitioner_id: string | null
          start_time: string | null
          status: string | null
          title: string | null
          treatment_type: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          body: string
          clinic_id: string
          clinical_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_completed?: boolean | null
          note_date: string
          note_type?: string
          patient_id: string
          practitioner_id?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          body?: string
          clinic_id?: string
          clinical_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_completed?: boolean | null
          note_date?: string
          note_type?: string
          patient_id?: string
          practitioner_id?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinical_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinical_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinical_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinical_notes_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_custom_fields: {
        Row: {
          clinic_id: string
          created_at: string | null
          field_key: string
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          field_key: string
          field_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          field_key?: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_custom_fields_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_custom_values: {
        Row: {
          created_at: string | null
          field_id: string
          id: string
          patient_id: string
          updated_at: string | null
          value_bool: boolean | null
          value_date: string | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string | null
          field_id: string
          id?: string
          patient_id: string
          updated_at?: string | null
          value_bool?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string
          id?: string
          patient_id?: string
          updated_at?: string | null
          value_bool?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_custom_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "patient_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_custom_values_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          clinic_id: string
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          patient_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          clinic_id: string
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          patient_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          clinic_id?: string
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          patient_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_flag_definitions: {
        Row: {
          clinic_id: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          label: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_flag_definitions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_flags: {
        Row: {
          created_at: string | null
          details: string | null
          flag_definition_id: string
          id: string
          patient_id: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          flag_definition_id: string
          id?: string
          patient_id: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          flag_definition_id?: string
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_flags_flag_definition_id_fkey"
            columns: ["flag_definition_id"]
            isOneToOne: false
            referencedRelation: "patient_flag_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_flags_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          clinic_id: string
          contact_auth_email: boolean | null
          contact_auth_whatsapp: boolean | null
          copago: number | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          document_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          full_name: string
          id: string
          is_deleted: boolean | null
          numero_afiliado: string | null
          obra_social: string | null
          phone: string | null
          preferred_name: string | null
          reminder_preference: string | null
          sesiones_autorizadas: number | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          contact_auth_email?: boolean | null
          contact_auth_whatsapp?: boolean | null
          copago?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          document_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name: string
          id?: string
          is_deleted?: boolean | null
          numero_afiliado?: string | null
          obra_social?: string | null
          phone?: string | null
          preferred_name?: string | null
          reminder_preference?: string | null
          sesiones_autorizadas?: number | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          contact_auth_email?: boolean | null
          contact_auth_whatsapp?: boolean | null
          copago?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          document_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name?: string
          id?: string
          is_deleted?: boolean | null
          numero_afiliado?: string | null
          obra_social?: string | null
          phone?: string | null
          preferred_name?: string | null
          reminder_preference?: string | null
          sesiones_autorizadas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_availability: {
        Row: {
          capacity: number | null
          clinic_id: string
          created_at: string | null
          from_time: string
          id: string
          practitioner_id: string
          slot_minutes: number | null
          to_time: string
          updated_at: string | null
          weekday: number
        }
        Insert: {
          capacity?: number | null
          clinic_id: string
          created_at?: string | null
          from_time: string
          id?: string
          practitioner_id: string
          slot_minutes?: number | null
          to_time: string
          updated_at?: string | null
          weekday: number
        }
        Update: {
          capacity?: number | null
          clinic_id?: string
          created_at?: string | null
          from_time?: string
          id?: string
          practitioner_id?: string
          slot_minutes?: number | null
          to_time?: string
          updated_at?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_availability_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_availability_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioners: {
        Row: {
          clinic_id: string
          color: string | null
          created_at: string | null
          display_name: string
          email: string | null
          id: string
          is_active: boolean | null
          license_id: string | null
          notes: string | null
          phone: string | null
          prefix: string | null
          specialties: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          clinic_id: string
          color?: string | null
          created_at?: string | null
          display_name: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          license_id?: string | null
          notes?: string | null
          phone?: string | null
          prefix?: string | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          clinic_id?: string
          color?: string | null
          created_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          license_id?: string | null
          notes?: string | null
          phone?: string | null
          prefix?: string | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioners_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: string
        }
        Insert: {
          description?: string | null
          id: string
        }
        Update: {
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      schedule_exceptions: {
        Row: {
          clinic_id: string
          created_at: string | null
          created_by: string | null
          date: string
          from_time: string | null
          id: string
          practitioner_id: string | null
          reason: string | null
          to_time: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          date: string
          from_time?: string | null
          id?: string
          practitioner_id?: string | null
          reason?: string | null
          to_time?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          from_time?: string | null
          id?: string
          practitioner_id?: string | null
          reason?: string | null
          to_time?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_types: {
        Row: {
          clinic_id: string
          color: string | null
          created_at: string | null
          default_duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          color?: string | null
          created_at?: string | null
          default_duration_minutes: number
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          color?: string | null
          created_at?: string | null
          default_duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_types_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          active: boolean | null
          clinic_id: string
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          clinic_id: string
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          locale: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          locale?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          locale?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_user: { Args: { target_user_id: string }; Returns: boolean }
      current_auth_user_id: { Args: never; Returns: string }
      current_practitioner_id: { Args: never; Returns: string }
      is_admin_clinic: { Args: { target_clinic_id: string }; Returns: boolean }
      is_health_pro: { Args: { target_clinic_id: string }; Returns: boolean }
      is_receptionist: { Args: { target_clinic_id: string }; Returns: boolean }
      is_tenant_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      appointment_mode: "in_person" | "virtual" | "home_visit"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_mode: ["in_person", "virtual", "home_visit"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
    },
  },
} as const
