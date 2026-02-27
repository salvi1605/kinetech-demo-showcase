

# Plan: Optimizar liberacion masiva y reprogramacion de citas

## Problema actual

### 1. Liberacion masiva (FreeAppointmentDialog)
La funcion `handleDeleteAll` elimina citas una por una en un loop secuencial:
```text
for (const apt of selectedAppointments) {
  await deleteAppointmentInDb(apt.id);  // 1 round-trip por cita
}
```
Para 10 citas seleccionadas = 10 round-trips = ~2-5 segundos desde Argentina.

### 2. Reprogramacion de cita (AppointmentDetailDialog.onSubmit)
Al editar/reprogramar una cita se ejecutan 5 consultas secuenciales:
```text
await query schedule_exceptions     -- bloqueos
await checkPractitionerAvailability -- disponibilidad
await checkConflictInDb             -- exclusividad
await query clinic_settings         -- sub_slots_per_block
await query appointments            -- slots ocupados
await updateAppointmentInDb         -- actualizar
TOTAL: 6 round-trips = ~1.5-3s
```

---

## Solucion

### Paso 1: Crear funcion SQL `delete_appointments_batch`

Nueva funcion PostgreSQL que recibe un array de UUIDs y los elimina en una sola transaccion. Retorna la cantidad eliminada y cualquier error.

Parametros: `p_appointment_ids UUID[]`
Retorna: `{ "deleted_count": N, "failed_ids": [...] }`

### Paso 2: Crear funcion SQL `validate_and_update_appointment`

Funcion que consolida la validacion y actualizacion de una cita en un solo round-trip. Replica las mismas reglas del frontend:

1. Verificar bloqueos en `schedule_exceptions`
2. Verificar disponibilidad en `practitioner_availability`
3. Verificar conflicto de tratamiento exclusivo
4. Calcular `sub_slot` libre automaticamente (si cambia fecha/hora/profesional)
5. Ejecutar el `UPDATE` en `appointments`

Parametros: id de la cita, campos nuevos (date, start_time, practitioner_id, status, treatment_type_key, notes)
Retorna: `{ "success": true/false, "error_code": "...", "error_message": "..." }`

### Paso 3: Agregar wrappers en `appointmentService.ts`

```text
deleteAppointmentsBatchRpc(ids: string[]) -> supabase.rpc('delete_appointments_batch', ...)
updateAppointmentRpc(id, updates)          -> supabase.rpc('validate_and_update_appointment', ...)
```

### Paso 4: Simplificar `FreeAppointmentDialog.tsx`

Reemplazar el loop secuencial (lineas 133-161) por una sola llamada a `deleteAppointmentsBatchRpc(selectedIds)`.

Antes: N citas x 1 DELETE = N round-trips
Despues: 1 round-trip para cualquier cantidad

### Paso 5: Simplificar `AppointmentDetailDialog.tsx`

Reemplazar las lineas 269-414 (6 consultas secuenciales de validacion + update) por una sola llamada a `updateAppointmentRpc()`. El manejo de errores traduce `error_code` al toast correspondiente.

Antes: 6 round-trips (~1.5-3s)
Despues: 1 round-trip (~200-300ms)

---

## Impacto esperado

| Escenario | Antes | Despues |
|-----------|-------|---------|
| Liberar 1 cita | ~300ms | ~300ms (sin cambio) |
| Liberar 10 citas | 2-5s | 200-400ms |
| Reprogramar cita | 1.5-3s | 200-300ms |

## Archivos a crear/modificar

1. **Nueva migracion SQL** - funciones `delete_appointments_batch` y `validate_and_update_appointment`
2. **`src/lib/appointmentService.ts`** - agregar wrappers RPC
3. **`src/components/dialogs/FreeAppointmentDialog.tsx`** - reemplazar loop por batch RPC
4. **`src/components/dialogs/AppointmentDetailDialog.tsx`** - reemplazar validaciones secuenciales por RPC

## Seguridad

- `delete_appointments_batch` usa `SECURITY DEFINER` y valida que las citas pertenezcan a la clinica del usuario
- `validate_and_update_appointment` aplica las mismas reglas de negocio que el frontend actual
- Las funciones frontend originales se mantienen como fallback

