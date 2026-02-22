# Validacion de excepciones al crear cita nueva

## Problema actual

Cuando se crea una cita nueva desde `NewAppointmentDialog`, el sistema valida:

- Disponibilidad horaria del profesional (`checkPractitionerAvailability`)
- Conflictos de slot (`checkSlotConflictInDb`)
- Conflictos de tratamiento exclusivo (`checkConflictInDb`)

Pero **NO valida** si el profesional seleccionado tiene un `practitioner_block` (vacaciones, licencia, etc.) para esa fecha. Esto permite agendar citas con un profesional que esta de vacaciones sin ninguna advertencia.

## Solucion

Agregar una consulta a `schedule_exceptions` dentro de la funcion `createAppointment` en `NewAppointmentDialog.tsx`, justo antes de las validaciones existentes (linea ~194). La consulta verificara si existe un `practitioner_block` para el profesional seleccionado en la fecha de la cita.

## Detalle tecnico

### Archivo: `src/components/dialogs/NewAppointmentDialog.tsx`

**Cambio unico**: Insertar validacion de excepciones entre la linea 190 (despues de validar `currentClinicId`) y la linea 194 (antes de `checkPractitionerAvailability`).

La validacion hara:

1. Consultar `schedule_exceptions` filtrando por:
  - `clinic_id` = clinica actual
  - `practitioner_id` = profesional seleccionado
  - `date` = fecha de la cita
  - `type` = `practitioner_block`
2. Si encuentra resultados:
  - Mostrar toast destructivo con el nombre del profesional y la razon (ej: "Telma Ayastuy tiene VACACIONES en esta fecha")
  - Debe mostrar error y no permitir que se agende la cita, si es una cita múltiple, no se debe permitir agendar ninguna cita hasta que la cita con error sea corregido. Debe mandar un mensaje específico de porque no se puede agendar la cita. 
3. Si no encuentra resultados: continuar con el flujo normal

No se necesitan cambios en otros archivos. La interfaz `ExceptionInfo` y el hook `useScheduleExceptions` no se utilizan aqui; se hace una consulta directa a la tabla para mantener la consistencia con el patron existente del dialogo (que ya usa `supabase` directamente para otras validaciones).