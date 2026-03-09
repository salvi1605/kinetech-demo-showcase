

# Diagnóstico: Mirian no puede editar el historial de Torti

## Causa raíz

La cita de Torti del **06/03/2026 a las 08:00** (id: `0972cc06-...`) **no tiene un registro de evolución (`patient_clinical_notes`) asociado**. Esto se debe a que esta cita fue creada antes de que se implementara la auto-creación de stubs en la función RPC `validate_and_create_appointment`, o fue creada mediante la creación masiva que no pasa por esa RPC.

El componente `ClinicalHistoryBlock` solo renderiza textareas para notas que ya existen en la base de datos. Sin nota = sin textarea = no hay nada que editar para hoy.

Hay **9 citas en total** en la clinica (hasta hoy) que carecen de sus stubs de evolución.

## Plan de corrección (2 partes)

### 1. Backfill de stubs faltantes (migración SQL)
Crear una migración que inserte stubs de evolución vacíos para todas las citas que no tienen su nota clínica asociada:

```sql
INSERT INTO patient_clinical_notes (
  patient_id, clinic_id, practitioner_id, appointment_id,
  note_date, start_time, note_type, body, treatment_type, status
)
SELECT 
  a.patient_id, a.clinic_id, a.practitioner_id, a.id,
  a.date, a.start_time, 'evolution', '', 
  COALESCE(tt.name, 'FKT'), 'active'
FROM appointments a
LEFT JOIN patient_clinical_notes n ON n.appointment_id = a.id
LEFT JOIN treatment_types tt ON a.treatment_type_id = tt.id
WHERE n.id IS NULL AND a.status != 'cancelled';
```

Esto crea inmediatamente el stub para la cita de hoy de Torti y las 8 restantes.

### 2. Fallback en el frontend (protección futura)
Modificar `usePatientClinicalNotes` o `ClinicalHistoryBlock` para que, al detectar citas sin nota asociada, cree el stub automáticamente via `upsertEvolutionNote`. Esto protege contra futuros casos donde las citas se creen por vías que no pasen por la RPC (importación, edición manual, etc.).

### Detalle técnico adicional
- Las notas existentes tienen `created_by: NULL`, lo cual no causa problemas de lectura pero podria afectar la política UPDATE de RLS para `health_pro`. La política tiene un OR que cubre el caso via la existencia de cita, así que funciona.
- La función `canEdit()` en el frontend verifica `entry.doctorId === currentPractitionerId`, lo cual coincide correctamente para Mirian.

