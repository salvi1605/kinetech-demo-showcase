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
          email_reminders_enabled: boolean
          id: string
          min_slot_minutes: number | null
          sub_slots_per_block: number
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
          email_reminders_enabled?: boolean
          id?: string
          min_slot_minutes?: number | null
          sub_slots_per_block?: number
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
          email_reminders_enabled?: boolean
          id?: string
          min_slot_minutes?: number | null
          sub_slots_per_block?: number
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
      clinical_note_versions: {
        Row: {
          body: string
          change_reason: string | null
          clinical_data: Json | null
          edited_at: string
          edited_by: string | null
          id: string
          note_id: string
        }
        Insert: {
          body?: string
          change_reason?: string | null
          clinical_data?: Json | null
          edited_at?: string
          edited_by?: string | null
          id?: string
          note_id: string
        }
        Update: {
          body?: string
          change_reason?: string | null
          clinical_data?: Json | null
          edited_at?: string
          edited_by?: string | null
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "patient_clinical_notes"
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
      contact_messages: {
        Row: {
          clinic: string | null
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
        }
        Insert: {
          clinic?: string | null
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
        }
        Update: {
          clinic?: string | null
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          first_name: string | null
          first_surname: string | null
          full_name: string
          id: string
          is_deleted: boolean | null
          numero_afiliado: string | null
          obra_social: string | null
          phone: string | null
          preferred_name: string | null
          reminder_preference: string | null
          second_name: string | null
          second_surname: string | null
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
          first_name?: string | null
          first_surname?: string | null
          full_name: string
          id?: string
          is_deleted?: boolean | null
          numero_afiliado?: string | null
          obra_social?: string | null
          phone?: string | null
          preferred_name?: string | null
          reminder_preference?: string | null
          second_name?: string | null
          second_surname?: string | null
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
          first_name?: string | null
          first_surname?: string | null
          full_name?: string
          id?: string
          is_deleted?: boolean | null
          numero_afiliado?: string | null
          obra_social?: string | null
          phone?: string | null
          preferred_name?: string | null
          reminder_preference?: string | null
          second_name?: string | null
          second_surname?: string | null
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
      practitioner_treatments: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          practitioner_id: string
          treatment_type_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          practitioner_id: string
          treatment_type_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          practitioner_id?: string
          treatment_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_treatments_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_treatments_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "treatment_types"
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      treatment_types: {
        Row: {
          clinic_id: string
          color: string | null
          created_at: string | null
          default_duration_minutes: number
          description: string | null
          id: string
          is_active: boolean | null
          max_concurrent: number
          name: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          color?: string | null
          created_at?: string | null
          default_duration_minutes: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          color?: string | null
          created_at?: string | null
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent?: number
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
      user_preferences: {
        Row: {
          compact_view: boolean
          created_at: string
          dark_theme: boolean
          email_notifications: boolean
          push_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          compact_view?: boolean
          created_at?: string
          dark_theme?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          compact_view?: boolean
          created_at?: string
          dark_theme?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          active: boolean | null
          clinic_id: string | null
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          clinic_id?: string | null
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
      auto_mark_no_show: { Args: never; Returns: undefined }
      can_view_user: { Args: { target_user_id: string }; Returns: boolean }
      create_clinic_onboarding: {
        Args: {
          p_country_code?: string
          p_default_currency?: string
          p_name: string
          p_timezone?: string
        }
        Returns: string
      }
      current_auth_user_id: { Args: never; Returns: string }
      current_practitioner_id: { Args: never; Returns: string }
      delete_appointments_batch: {
        Args: { p_appointment_ids: string[] }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_appointment_email_audit: {
        Args: {
          p_clinic_id?: string
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
          p_recipient?: string
        }
        Returns: {
          appointment_id: string
          clinic_id: string
          clinic_name: string
          created_at: string
          id: string
          recipient_email: string
          template_name: string
          total_count: number
          user_email: string
          user_full_name: string
          user_id: string
          was_test: boolean
        }[]
      }
      get_first_visit_dates: {
        Args: { p_clinic_id: string; p_patient_ids: string[] }
        Returns: {
          first_date: string
          patient_id: string
        }[]
      }
      is_admin_clinic: { Args: { target_clinic_id: string }; Returns: boolean }
      is_health_pro: { Args: { target_clinic_id: string }; Returns: boolean }
      is_receptionist: { Args: { target_clinic_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_owner: { Args: never; Returns: boolean }
      log_appointment_email_sent: {
        Args: {
          p_appointment_id: string
          p_recipient_email: string
          p_template_name: string
          p_was_test?: boolean
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      super_admin_create_clinic: {
        Args: {
          p_country_code?: string
          p_default_currency?: string
          p_name: string
          p_owner_user_id?: string
          p_timezone?: string
        }
        Returns: string
      }
      validate_and_create_appointment: {
        Args: {
          p_clinic_id: string
          p_date: string
          p_mode?: string
          p_notes?: string
          p_patient_id: string
          p_practitioner_id: string
          p_start_time: string
          p_sub_slot?: number
          p_treatment_type_key?: string
        }
        Returns: Json
      }
      validate_and_create_appointments_batch: {
        Args: { p_appointments: Json }
        Returns: Json
      }
      validate_and_update_appointment: {
        Args: {
          p_appointment_id: string
          p_date?: string
          p_notes?: string
          p_practitioner_id?: string
          p_start_time?: string
          p_status?: string
          p_sub_slot?: number
          p_treatment_type_key?: string
        }
        Returns: Json
      }
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
