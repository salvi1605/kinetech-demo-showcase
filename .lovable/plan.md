

## Plan: Corregir slots fantasma en reprogramación

### Problema (causa raíz)

En `RescheduleSlotPicker.tsx` (línea 72), la consulta de citas filtra por `practitioner_id`, mostrando solo las del kinesiólogo seleccionado. Sin embargo, la base de datos impone unicidad **global por clínica** sobre `(clinic_id, date, start_time, sub_slot)` — el índice `uq_appointments_active_slot`. Resultado: un sub-slot ocupado por OTRO kinesiólogo aparece visualmente como "Libre", pero al confirmar la reprogramación la RPC `validate_and_update_appointment` lo rechaza con `SLOT_FULL`.

Esto es exactamente lo que reporta Marianela: ve "Libre" pero el sistema le dice que está ocupado.

### Solución

Quitar el filtro `.eq('practitioner_id', practitionerId)` en la consulta de citas para mostrar la ocupación **real global** del bloque horario, igual que la valida la BD.

### Cambio único

**Archivo:** `src/components/shared/RescheduleSlotPicker.tsx`

1. **Líneas 68-74**: Eliminar el filtro por `practitioner_id` en la consulta de `appointments`. Traer todas las citas activas de la clínica para esa fecha. Agregar `practitioner_id` al `SELECT` para poder distinguir las propias en la UI.

2. **Líneas 145-160** (construcción de `occupiedMap`): Mantener el mapa global de ocupación. Para preservar el indicador "Actual" del turno que se está reprogramando, seguir usando `currentAppointmentId` como referencia.

3. **Etiqueta visual** (opcional, mejora UX): Cuando un sub-slot esté ocupado por OTRO profesional, seguir mostrando "Ocupado" (el usuario no necesita saber por quién — basta con que no pueda elegirlo). Cuando sea del profesional actual seleccionado, también "Ocupado". Solo el `currentAppointmentId` mostrará "Actual".

### Comportamiento esperado tras el fix

- Si Mariela está reprogramando con la Lic. X y el sub-slot 3 de las 10:00 ya tiene una cita con la Lic. Y, ese sub-slot se mostrará como **"Ocupado"** (correcto).
- El sub-slot del turno que se reprograma seguirá apareciendo como **"Actual"**.
- Ya no habrá discrepancia entre lo que muestra la UI y lo que acepta la BD.

### Sin migraciones de BD

La RPC y el índice ya son correctos. Solo se corrige la consulta del picker para alinear la UI con la realidad de la base.

### Validación post-implementación

| Escenario | Antes | Después |
|---|---|---|
| Sub-slot ocupado por mismo profesional | Ocupado ✅ | Ocupado ✅ |
| Sub-slot ocupado por otro profesional | Libre ❌ | Ocupado ✅ |
| Sub-slot del turno actual | Actual ✅ | Actual ✅ |
| Sub-slot realmente libre en toda la clínica | Libre ✅ | Libre ✅ |

