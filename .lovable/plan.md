

# Plan: Implementar cambios aprobados de auditoría de integridad

## Dependencias detectadas sobre borrados físicos

**`demoDataService.ts`** realiza borrado físico de clínicas y sus datos en este orden: appointments → patients → practitioners → clinic_settings → clinics. Este orden es compatible con RESTRICT porque elimina hijos antes que padres. **No hay riesgo.**

**No existe código que borre practitioners o clinics directamente** fuera del servicio de demo. Las ediciones de profesionales solo borran registros hijos (availability, treatments).

**`patient_clinical_notes.appointment_id`** mantiene CASCADE (no está en scope) — el borrado de citas individuales sigue limpiando notas clínicas automáticamente.

**Conclusión: todos los cambios aprobados son seguros de aplicar.**

---

## Migración única a ejecutar

### 1. Foreign Keys — CASCADE → RESTRICT/SET NULL

| Tabla | Columna | Antes | Después |
|---|---|---|---|
| `appointments` | `practitioner_id` | CASCADE | RESTRICT |
| `appointments` | `clinic_id` | CASCADE | RESTRICT |
| `patients` | `clinic_id` | CASCADE | RESTRICT |
| `patient_clinical_notes` | `clinic_id` | CASCADE | RESTRICT |
| `patient_clinical_notes` | `practitioner_id` | CASCADE | SET NULL |

### 2. Trigger de validación cross-clinic

Función `fn_validate_appointment_clinic_consistency()` + trigger `trg_validate_appointment_clinic` en `BEFORE INSERT OR UPDATE` sobre `appointments`. Valida que patient y practitioner pertenezcan a la misma clinic_id de la cita.

### 3. Índice faltante

`CREATE INDEX IF NOT EXISTS idx_clinical_notes_practitioner ON patient_clinical_notes(practitioner_id)`

### No se modifica

- Ningún dato existente
- Ninguna otra FK fuera de las 5 listadas
- Ningún archivo frontend
- `appointments.patient_id` FK (ya es SET NULL, no cambia)

