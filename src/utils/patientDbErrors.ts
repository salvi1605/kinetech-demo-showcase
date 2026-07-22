/**
 * Mapea errores de Postgres/Supabase provenientes de la tabla `public.patients`
 * a mensajes en español apuntando al campo específico del formulario.
 *
 * Códigos Postgres relevantes:
 *  - 23502 not_null_violation
 *  - 23514 check_violation
 *  - 23505 unique_violation
 */

export type PatientFormField = 'documentId' | 'dateOfBirth' | 'mobilePhone' | 'fullName';

export type PatientFormSection = 'identificacion' | 'emergencia' | 'clinico' | 'seguro';

export interface ParsedPatientDbError {
  /** Campo del formulario a marcar en rojo (si corresponde). */
  field?: PatientFormField;
  /** Sección/paso del wizard donde vive el campo. */
  section?: PatientFormSection;
  /** Mensaje corto para mostrar bajo el campo. */
  fieldMessage?: string;
  /** Título del toast. */
  toastTitle: string;
  /** Descripción del toast. */
  toastDescription: string;
}

interface RawError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

const FIELD_SECTION: Record<PatientFormField, PatientFormSection> = {
  documentId: 'identificacion',
  dateOfBirth: 'identificacion',
  mobilePhone: 'identificacion',
  fullName: 'identificacion',
};

/**
 * Extrae el nombre de la columna cuando el mensaje viene de un NOT NULL violation.
 * Postgres devuelve `null value in column "phone" of relation "patients" violates ...`
 */
function extractColumnFromNotNull(message: string): string | null {
  const match = message.match(/column "([^"]+)"/i);
  return match ? match[1] : null;
}

function mapColumnToField(column: string): PatientFormField | null {
  switch (column) {
    case 'document_id':
      return 'documentId';
    case 'date_of_birth':
      return 'dateOfBirth';
    case 'phone':
      return 'mobilePhone';
    case 'full_name':
      return 'fullName';
    default:
      return null;
  }
}

export function parsePatientDbError(error: unknown): ParsedPatientDbError {
  const err = (error ?? {}) as RawError;
  const code = err.code ?? '';
  const rawMessage = err.message ?? '';
  const details = err.details ?? '';
  const combined = `${rawMessage} ${details}`.toLowerCase();

  // 23505 — Unique: DNI duplicado en la clínica.
  if (
    code === '23505' ||
    combined.includes('idx_patients_unique_document_per_clinic') ||
    (combined.includes('patients') && combined.includes('document_id') && combined.includes('unique'))
  ) {
    return {
      field: 'documentId',
      section: 'identificacion',
      fieldMessage: 'Ya existe un paciente con este DNI en la clínica.',
      toastTitle: 'DNI duplicado',
      toastDescription: 'Ya existe un paciente registrado con este DNI en la clínica.',
    };
  }

  // 23514 — CHECK: campos en blanco o fecha de nacimiento futura.
  if (code === '23514' || combined.includes('violates check constraint')) {
    if (combined.includes('patients_document_id_not_blank')) {
      return {
        field: 'documentId',
        section: 'identificacion',
        fieldMessage: 'El DNI no puede estar vacío.',
        toastTitle: 'DNI obligatorio',
        toastDescription: 'Ingresá un DNI válido para el paciente.',
      };
    }
    if (combined.includes('patients_phone_not_blank')) {
      return {
        field: 'mobilePhone',
        section: 'identificacion',
        fieldMessage: 'El teléfono no puede estar vacío.',
        toastTitle: 'Teléfono obligatorio',
        toastDescription: 'Ingresá un teléfono de contacto válido.',
      };
    }
    if (combined.includes('patients_date_of_birth_not_future')) {
      return {
        field: 'dateOfBirth',
        section: 'identificacion',
        fieldMessage: 'La fecha de nacimiento no puede ser futura.',
        toastTitle: 'Fecha de nacimiento inválida',
        toastDescription: 'La fecha de nacimiento debe ser igual o anterior a hoy.',
      };
    }
  }

  // 23502 — NOT NULL: campo obligatorio faltante.
  if (code === '23502' || combined.includes('null value in column')) {
    const column = extractColumnFromNotNull(rawMessage) ?? extractColumnFromNotNull(details);
    const field = column ? mapColumnToField(column) : null;
    if (field) {
      const labels: Record<PatientFormField, string> = {
        documentId: 'DNI',
        dateOfBirth: 'Fecha de nacimiento',
        mobilePhone: 'Teléfono',
        fullName: 'Nombre',
      };
      const label = labels[field];
      return {
        field,
        section: FIELD_SECTION[field],
        fieldMessage: `${label} es obligatorio.`,
        toastTitle: `${label} obligatorio`,
        toastDescription: `Completá el campo "${label}" antes de guardar.`,
      };
    }
  }

  // Fallback genérico.
  return {
    toastTitle: 'No se pudo guardar el paciente',
    toastDescription: rawMessage || 'Ocurrió un error inesperado. Revisá los datos e intentá nuevamente.',
  };
}
