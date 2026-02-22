
# Validacion de excepciones en todos los flujos de citas

## Problema

La validacion de `practitioner_block` (vacaciones, licencia, etc.) solo se agregó en `NewAppointmentDialog`. Faltan estos otros flujos:

1. **AppointmentDetailDialog** (reprogramar/editar cita) - Permite cambiar fecha, hora o profesional sin verificar bloqueos.
2. **MassCreateAppointmentDialog** (creacion masiva) - Crea multiples citas sin verificar si el profesional asignado tiene bloqueo en alguna de las fechas.

`FreeAppointmentDialog` solo elimina citas, no necesita esta validacion.

## Cambios

### 1. `src/components/dialogs/AppointmentDetailDialog.tsx`

Insertar la verificacion de `schedule_exceptions` justo antes de la validacion de disponibilidad (~linea 269), dentro del bloque `if (state.currentClinicId)`. La logica:

- Consultar `schedule_exceptions` filtrando por `clinic_id`, `practitioner_id`, `date` y `type = 'practitioner_block'`
- Si existe un bloqueo, mostrar toast destructivo con el nombre del profesional y la razon (ej: "Telma Ayastuy tiene VACACIONES en esta fecha. No se puede reprogramar la cita.")
- Retornar sin guardar cambios

### 2. `src/components/dialogs/MassCreateAppointmentDialog.tsx`

Insertar la verificacion dentro del loop `for (const slot of allowedSlots)` (~linea 227), antes de verificar conflictos de citas existentes. La logica:

- Para cada slot, consultar `schedule_exceptions` filtrando por `clinic_id`, `practitioner_id` del slot, `date` del slot y `type = 'practitioner_block'`
- Si existe un bloqueo en **cualquier** slot, agregar ese slot a la lista de `failed` con mensaje descriptivo (ej: "Lun 10/03 08:00 - Profesional tiene VACACIONES")
- **No insertar ninguna cita** si hay al menos un slot bloqueado (comportamiento consistente con el plan aprobado: "no se debe permitir agendar ninguna cita hasta que la cita con error sea corregida")
- Mostrar toast destructivo listando los slots con conflicto

## Detalle tecnico

Ambas validaciones siguen el mismo patron ya implementado en `NewAppointmentDialog`: consulta directa a `supabase.from('schedule_exceptions')` sin usar hooks adicionales. El toast usa `variant: "destructive"` y muestra el nombre del profesional + razon del bloqueo.
