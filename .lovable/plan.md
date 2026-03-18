

# Excepciones de horario especial por profesional — Plan

## Resumen del problema

El tipo `extended_hours` ya existe en la UI y en la tabla `schedule_exceptions`, pero **no tiene efecto real**: las funciones RPC `validate_and_create_appointment` y `validate_and_update_appointment` solo consultan `practitioner_availability` (horario semanal regular) y `practitioner_block`. Nunca consultan excepciones de tipo `extended_hours`.

Resultado: se puede crear la excepción, pero el sistema sigue rechazando citas fuera del horario regular.

## Cambio necesario

Modificar la lógica de validación de disponibilidad en las dos funciones RPC para que, cuando exista una excepción `extended_hours` para ese profesional en esa fecha, se use el rango horario de la excepción **en lugar de** (o **además de**) el horario regular semanal.

## Decisiones de diseño

**Semántica de `extended_hours`**: ¿reemplaza o extiende?
- **Opción A — Reemplaza**: ese día el profesional SOLO atiende en el rango de la excepción (ignora el horario semanal).
- **Opción B — Extiende**: se suman ambos rangos (el regular + el de la excepción).

Recomiendo **Opción B (extiende)** porque es más flexible y coincide con el nombre "horario extendido". Si el profesional quiere atender SOLO en un rango diferente, puede combinar un `practitioner_block` (bloqueo de todo el día) + un `extended_hours` con el nuevo rango.

Sin embargo, según tu ejemplo ("Victoria normalmente ve 14-19:30 pero el 19 de marzo quiere ver todo el día"), la **Opción B** resuelve directamente: se agrega una excepción de 08:00-14:00 y el sistema permite citas tanto en 08:00-14:00 (excepción) como en 14:00-19:30 (regular).

## Impacto técnico

```text
Componentes afectados:
┌──────────────────────────────────────────┐
│ validate_and_create_appointment (RPC)    │ ← agregar consulta extended_hours
│ validate_and_update_appointment (RPC)    │ ← agregar consulta extended_hours
│ checkPractitionerAvailability.ts (front) │ ← agregar consulta extended_hours
│ useScheduleExceptions.ts (isBlocked)     │ ← no bloquear extended_hours
└──────────────────────────────────────────┘

NO se modifica:
- Tabla schedule_exceptions (ya tiene todo lo necesario)
- UI de excepciones (ya soporta crear extended_hours)
- Schema de base de datos
```

## Plan de implementación

### Paso 1 — Modificar las 2 funciones RPC (migración SQL)

En la sección de verificación de disponibilidad de ambas funciones, antes de rechazar por `OUT_OF_HOURS`, consultar si existe una excepción `extended_hours` para ese profesional+fecha+hora:

```sql
-- Después de verificar practitioner_availability y ANTES de rechazar:
IF NOT v_is_within_slot THEN
  -- Verificar si hay extended_hours para este día
  SELECT EXISTS(
    SELECT 1 FROM schedule_exceptions
    WHERE clinic_id = <clinic> AND practitioner_id = <practitioner>
      AND date = <date> AND type = 'extended_hours'
      AND <start_time> >= from_time AND <start_time> < to_time
  ) INTO v_has_extended;

  IF v_has_extended THEN
    -- Permitir: cae dentro de horario extendido
    v_is_within_slot := true;
  END IF;
END IF;
```

### Paso 2 — Actualizar `checkPractitionerAvailability.ts` (frontend)

Agregar una consulta a `schedule_exceptions` de tipo `extended_hours` para la fecha específica y combinar esos slots con los de `practitioner_availability`.

### Paso 3 — Ajustar `isBlocked` en `useScheduleExceptions.ts`

Verificar que `extended_hours` no se trate como bloqueo (actualmente no lo hace, pero confirmar).

### Resumen de archivos

| Archivo | Acción |
|---|---|
| Migración SQL (2 funciones RPC) | Modificar |
| `src/utils/appointments/checkPractitionerAvailability.ts` | Modificar |
| `src/hooks/useScheduleExceptions.ts` | Verificar (probablemente sin cambios) |

No se crean tablas, buckets, edge functions ni secrets nuevos. Es un cambio puramente de lógica de validación.

