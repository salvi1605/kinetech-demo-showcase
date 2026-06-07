## Objetivo

Corregir `RescheduleSlotPicker` para que muestre todos los slots dentro del horario real del profesional, no solo dentro de `workday_start`/`workday_end` de la clínica.

## Causa raíz (recordatorio)

Hoy la grilla se genera con `generateTimeSlots(workday_start, workday_end, slotMinutes)` y luego se aplica `.slice(0, -1)`. Si la clínica termina a 19:00 pero el profesional atiende hasta 19:30, los slots 19:00 y 19:30 nunca se renderizan.

## Cambios (solo UI, sin tocar BD ni configuración de clínica)

### Archivo único: `src/components/shared/RescheduleSlotPicker.tsx`

1. Tras el `Promise.all`, además de `availRes` (disponibilidad regular del weekday), traer también las excepciones de tipo `extended_hours` para esa fecha y profesional (mismo patrón que `checkPractitionerAvailability.ts`).

2. Calcular el rango efectivo de la grilla:
   - `effectiveStart = min(clinic.workday_start, min(from_time) de availRes + extended_hours)`
   - `effectiveEnd = max(clinic.workday_end, max(to_time) de availRes + extended_hours)`
   - Si el profesional no tiene disponibilidad ese día ni extended_hours, usar los valores de la clínica (comportamiento actual).
   - Normalizar a `HH:mm` con `formatTimeShort`.

3. Generar la grilla con `generateTimeSlots(effectiveStart, effectiveEnd, slotMinutes)`.

4. Reemplazar el `.slice(0, -1)` actual por un filtro que descarte slots cuya hora sea `>= effectiveEnd` (equivalente correcto cuando el rango ya no necesariamente termina en un múltiplo del slot original de la clínica). Esto evita renderizar el "borde superior" como slot iniciable.

5. Mantener intacto el resto de la lógica: bloqueos parciales (`partialBlocks`), `fullDayBlock`, mapa de ocupados, render de sub-slots (`Actual`/`Bloqueado`/`Ocupado`/`Libre`/`Nuevo`), y el aviso "Sin disponibilidad configurada para este día".

## Lo que NO se toca

- `clinic_settings.workday_start` / `workday_end` (no se modifica config global).
- `useClinicSettings`, calendario principal, `NewAppointmentDialog`, validaciones de `checkPractitionerAvailability`.
- Lógica de conflictos, RLS ni RPCs.

## Cómo verificar

1. Profesional con `practitioner_availability.to_time = 19:30` un día puntual → al reprogramar una cita de ese día, la grilla muestra hasta 19:30 inclusive (último slot iniciable = 19:00; 19:30 no aparece porque sería inicio fuera del rango).
2. Profesional que solo atiende 09:00–13:00 → la grilla muestra de 08:00 (clínica) a 19:00 (clínica), mismo comportamiento que hoy, porque sus horarios caen dentro del rango de la clínica.
3. Profesional con `extended_hours` 19:00–20:30 ese día → la grilla se extiende hasta 20:30.
4. Día sin disponibilidad y sin extended_hours → comportamiento idéntico al actual (grilla = horario clínica, aviso amarillo visible).

¿Confirmás que avance con este cambio?
