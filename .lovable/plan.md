

# Plan de Optimizacion: Reducir latencia en creacion de citas

## Resumen

Consolidar las 5-6 consultas secuenciales que ocurren al crear una cita en una unica funcion PostgreSQL del lado del servidor. Esto elimina los round-trips de red desde Argentina y reduce el tiempo de ~2s a ~300ms.

## Que cambia y que NO cambia

**NO cambia (intacto):**
- Esquema de tablas (appointments, schedule_exceptions, practitioner_availability, treatment_types)
- Politicas RLS existentes
- Formularios, validaciones Zod, UI de los dialogs
- Hooks de consulta (useAppointmentsForClinic, usePatientAppointments)
- Flujo de estados y toasts de error (mismos mensajes)

**SI cambia:**
- La logica de validacion se mueve del frontend al servidor (mismas reglas, diferente ubicacion)
- Se reemplazan ~80 lineas de llamadas secuenciales por 1 llamada RPC en cada dialog

---

## Paso 1: Crear funcion SQL `validate_and_create_appointment`

Nueva migracion SQL que crea una funcion PostgreSQL. La funcion recibe los datos de la cita y ejecuta internamente (sin latencia de red entre pasos):

1. Verificar bloqueos del profesional en `schedule_exceptions`
2. Verificar disponibilidad horaria en `practitioner_availability`
3. Verificar conflicto de sub-slot en `appointments`
4. Verificar conflicto de tratamiento exclusivo (Drenaje/Masaje)
5. Resolver `treatment_type_id` por nombre en `treatment_types`
6. Insertar en `appointments`

Retorna un objeto JSONB:
- Exito: `{ "success": true, "appointment_id": "uuid" }`
- Error: `{ "success": false, "error_code": "BLOCKED|OUT_OF_HOURS|SLOT_TAKEN|EXCLUSIVE_CONFLICT", "error_message": "texto descriptivo" }`

La funcion usa `SECURITY DEFINER` para acceder a las tablas necesarias dentro de la misma transaccion.

## Paso 2: Crear funcion SQL `validate_and_create_appointments_batch`

Segunda funcion para creacion masiva. Recibe un array JSON de citas y las procesa en un solo llamado. Retorna un array con el resultado de cada una (creada o rechazada con razon).

## Paso 3: Actualizar `appointmentService.ts`

Agregar dos funciones wrapper:

```text
createAppointmentRpc(input) -> llama supabase.rpc('validate_and_create_appointment', {...})
createAppointmentsBatchRpc(inputs) -> llama supabase.rpc('validate_and_create_appointments_batch', {...})
```

Las funciones existentes (`createAppointment`, `createMultipleAppointments`) se mantienen como fallback pero no se usaran en los dialogs principales.

## Paso 4: Simplificar `NewAppointmentDialog.tsx`

Reemplazar las lineas 209-283 (5 consultas secuenciales: blocks, availability, slotConflict, exclusiveConflict, treatmentLookup) por una sola llamada a `createAppointmentRpc()`. El manejo de errores se traduce del `error_code` retornado al toast correspondiente (mismos mensajes que hoy).

Antes (simplificado):
```text
await query schedule_exceptions      -- 200ms
await checkPractitionerAvailability  -- 200ms  
await checkSlotConflictInDb          -- 200ms
await checkConflictInDb              -- 200ms
await createAppointmentInDb          -- 200ms (incluye lookup treatment_types)
TOTAL: ~1000-1500ms
```

Despues:
```text
await supabase.rpc('validate_and_create_appointment', {...})  -- 200-300ms
TOTAL: ~200-300ms
```

## Paso 5: Simplificar `MassCreateAppointmentDialog.tsx`

Reemplazar las lineas 136-316 (loops secuenciales con 3-4 queries por slot) por una sola llamada a `createAppointmentsBatchRpc()`. El resultado indica cuales se crearon y cuales fallaron, manteniendo el mismo flujo de UI (toast parcial, dialog de fallos).

Antes: N slots x 3-4 queries = 15-20 round-trips para 5 citas
Despues: 1 round-trip para cualquier cantidad de citas

---

## Impacto esperado en tiempos

| Escenario | Antes (desde Argentina) | Despues |
|-----------|------------------------|---------|
| 1 cita individual | 1.0 - 2.5s | 200 - 300ms |
| 5 citas masivas | 3 - 8s | 300 - 500ms |
| 10 citas masivas | 6 - 15s | 400 - 600ms |

## Archivos a crear/modificar

1. **Nueva migracion SQL** - funciones `validate_and_create_appointment` y `validate_and_create_appointments_batch`
2. **`src/lib/appointmentService.ts`** - agregar wrappers RPC
3. **`src/components/dialogs/NewAppointmentDialog.tsx`** - reemplazar validaciones secuenciales por RPC
4. **`src/components/dialogs/MassCreateAppointmentDialog.tsx`** - reemplazar loop secuencial por RPC batch

## Riesgos y mitigacion

- **Mismas reglas de negocio**: la funcion SQL replica exactamente las mismas validaciones que hoy hace el frontend (bloqueos, disponibilidad, exclusividad, sub-slot)
- **Atomicidad**: si falla cualquier validacion, no se inserta nada (transaccion implicita de PostgreSQL)
- **Rollback facil**: las funciones frontend originales se mantienen en el codigo como fallback

