

# Diagnostico y Plan: Rediseno del Historial Clinico

## Diagnostico de Impacto

### Estado Actual vs Requerido

| Area | Estado actual | Requerido |
|------|--------------|-----------|
| Stub de evolucion | Se crea al abrir el modal (ClinicalHistoryDialog useEffect) | Crear al crear la cita (en RPC o post-insert) |
| Reprogramacion | La evolucion NO se mueve con la cita | Mover fecha/hora de la evolucion al reprogramar |
| Cancelacion | No hay logica especial | Vacia: eliminar. Con contenido: conservar + anotacion sistema |
| Permisos receptionist | Ve boton y accede al historial (RoleGuard lo incluye en Patients.tsx) | Sin acceso al historial ni boton |
| Permisos health_pro | Puede editar cualquier dia (canEdit retorna true si date === today) | Ver todo, editar solo hoy, ver historial de versiones |
| Permisos admin | Edita todo sin registro de version | Edita todo + versionado obligatorio en fechas pasadas |
| Versionado | No existe | Tabla de versiones, boton "Ver historial de versiones" |
| Guardado offline | No existe | Guardar en memoria/localStorage como fallback de desconexion |

---

## Cambios Delta por Archivo

### 1. Nueva tabla: `clinical_note_versions`

```text
clinical_note_versions
  id           UUID PK
  note_id      UUID FK -> patient_clinical_notes.id ON DELETE CASCADE
  body         TEXT
  clinical_data JSONB (nullable, para snapshots)
  edited_by    UUID (user_id de public.users)
  edited_at    TIMESTAMPTZ DEFAULT now()
  change_reason TEXT (nullable)
```

- RLS: mismas politicas que `patient_clinical_notes` (lectura para admin/health_pro asignados; sin acceso receptionist).
- Indice en `(note_id, edited_at DESC)`.

### 2. Migracion SQL

- CREATE TABLE `clinical_note_versions`.
- Habilitar RLS.
- Politicas: admin_clinic full, health_pro SELECT asignados, receptionist ninguna.
- Modificar `validate_and_update_appointment` para: al cambiar fecha/hora/profesional, hacer UPDATE en `patient_clinical_notes` donde `appointment_id = p_appointment_id` para actualizar `note_date` y `start_time`.
- Modificar `validate_and_create_appointment` para: despues del INSERT de la cita, insertar un stub en `patient_clinical_notes` con body vacio, note_type='evolution'.
- Agregar logica en el status='cancelled' de `validate_and_update_appointment`: si la evolucion tiene body vacio, DELETE; si tiene contenido, agregar "[Sistema] Cita cancelada el DD/MM/YYYY" al body.

### 3. `src/components/patients/ClinicalHistoryDialog.tsx`

- Eliminar el useEffect de `ensureEvolutionStubs` (ya no es necesario, los stubs se crean en el RPC al crear la cita).
- Agregar RoleGuard: si `receptionist`, no renderizar el dialog (fallback a null).

### 4. `src/components/patients/ClinicalHistoryBlock.tsx`

- **canEdit**: cambiar logica:
  - `health_pro`: solo `entry.date === today` (ya esta asi, pero verificar que no pueda editar pasado).
  - `admin_clinic`/`tenant_owner`: siempre true, pero al guardar fecha pasada, crear version previa automaticamente.
- **handleBlur / saveToDb**: antes de hacer upsert en una fecha pasada (admin), guardar version anterior en `clinical_note_versions`.
- Agregar boton "Ver historial de versiones" por cada evolucion (visible para health_pro y admin).
- Nuevo componente inline o dialog pequeno: `VersionHistoryPopover` que lista versiones de un note_id.

### 5. `src/pages/Patients.tsx`

- RoleGuard del boton Historial: quitar `'receptionist'` (ya no esta, pero verificar en mobile cards linea 402).
- Confirmar que en ambas vistas (tabla desktop y cards mobile) el boton no se muestra a receptionist.

### 6. `src/components/patients/PatientHistoryButton.tsx`

- Envolver el boton en RoleGuard excluyendo receptionist (actualmente no tiene RoleGuard).

### 7. `src/lib/clinicalNotesService.ts`

- Nueva funcion `saveNoteVersion(noteId, body, clinicalData, userId)`: INSERT en `clinical_note_versions`.
- Nueva funcion `fetchNoteVersions(noteId)`: SELECT desde `clinical_note_versions` ORDER BY edited_at DESC.
- Modificar `upsertEvolutionNote`: antes de UPDATE, si la nota ya existe y es fecha pasada, llamar `saveNoteVersion`.

### 8. `src/hooks/usePatientClinicalNotes.ts`

- Sin cambios estructurales. El realtime ya escucha `patient_clinical_notes`.

### 9. `src/components/patients/ClinicalSnapshotBlock.tsx`

- Agregar boton "Ver historial de versiones" para snapshots (misma logica).
- En `handleEdit` (admin editando snapshot pasado): guardar version previa antes de actualizar.

### 10. Nuevo componente: `src/components/patients/NoteVersionHistory.tsx`

- Dialog o Popover que recibe `noteId`.
- Lista de versiones con fecha, usuario, texto (readonly).
- Solo lectura, sin edicion.

### 11. Guardado offline (fallback)

- En `ClinicalHistoryBlock.handleBlur`: si el upsert falla por error de red, guardar draft en `localStorage` con key `clinical-draft-{appointmentId}`.
- Al abrir el dialog, verificar si hay drafts pendientes y mostrar toast "Hay cambios sin guardar" con boton para reintentar.
- Al guardar exitosamente, limpiar el draft de localStorage.

---

## Tablas Afectadas

| Tabla | Cambio |
|-------|--------|
| `clinical_note_versions` | NUEVA |
| `patient_clinical_notes` | Sin cambio de schema. Logica de stub/move/cancel en RPCs |
| `appointments` | Sin cambio de schema |

## RLS Afectado

| Tabla | Politica | Detalle |
|-------|----------|---------|
| `clinical_note_versions` | admin_full_access (ALL) | `is_admin_clinic(clinic_id)` via JOIN a note -> patient |
| `clinical_note_versions` | health_pro_view (SELECT) | Misma logica de pacientes asignados |
| `clinical_note_versions` | receptionist | Ninguna politica (sin acceso) |

## Criterios de Aceptacion

1. Al crear una cita (individual o masiva), se crea automaticamente un stub de evolucion vacio en `patient_clinical_notes`.
2. Al reprogramar una cita (cambio de fecha/hora), la evolucion asociada actualiza su `note_date` y `start_time`.
3. Al cancelar una cita con evolucion vacia, la evolucion se elimina.
4. Al cancelar una cita con evolucion con contenido, se conserva y se agrega anotacion de sistema.
5. El boton "Historial" no es visible para `receptionist` en ninguna vista.
6. `health_pro` puede ver todas las fechas pero solo editar el dia actual.
7. `admin_clinic`/`tenant_owner` pueden editar cualquier fecha; al editar fecha pasada se guarda version previa.
8. Existe boton "Ver historial de versiones" por evolucion y snapshot (visible para health_pro y admin).
9. Si falla el guardado por desconexion, el draft se persiste localmente y se muestra aviso al reabrir.
10. No se modifican archivos fuera del modulo de historial excepto las RPCs de citas (delta minimo para hooks de stub/move/cancel).

