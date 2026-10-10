# Revert del selector "Sub-turno disponible" en "Nuevo Turno"

## Diagnóstico
En `NewAppointmentDialog.tsx` hoy conviven tres piezas agregadas recientemente:
1. Selector visible `SubSlotPicker` (líneas ~360–370) dentro del bloque de fecha/hora.
2. Lógica de precarga con `preselectKey` + `preselectedRef` (líneas ~103–125) que copia `selectedSlot.subSlot` al estado, pero deja `null` cuando no viene fila (FAB / "Crear cita" desde ficha).
3. Botón "Confirmar turno" con `disabled={isSubmitting || !selectedSubSlot}` (línea ~563): si el estado es `null`, el botón queda bloqueado. Esa es la regresión que siente el usuario.

El envío ya tiene el fallback histórico: `const subSlot = selectedSubSlot ?? 1` (línea 183). La agenda (`Calendar.tsx`) ya pasa `selectedSlot.subSlot` 1-based cuando se toca una fila. No hace falta tocar la base ni el RPC: `create_appointment` sigue validando choques y rango (1..sub_slots_per_block) y devuelve error claro si la posición está ocupada.

## Cambios (solo `src/components/dialogs/NewAppointmentDialog.tsx`)
1. Quitar el render del `SubSlotPicker` y su `import`.
2. Eliminar el estado `selectedSubSlot`, `maxSubSlots`, `preselectKey`, `preselectedRef` y simplificar el efecto de `selectedSlot` a lo que hacía antes: setear `date` y `startTime`.
3. En `createAppointment`, deducir el sub-turno así:
   - Si vino fila desde la agenda: `selectedSlot.subSlot` (si está dentro de `1..sub_slots_per_block`).
   - Si no vino fila: `1` (comportamiento anterior).
4. Botón "Confirmar turno": volver a `disabled={isSubmitting}`.
5. Si el RPC rechaza por posición ocupada, se mantiene el toast de error existente (sin cambios).

## Fuera de alcance
- No se borra `src/components/shared/SubSlotPicker.tsx` (queda sin uso, por si se reutiliza; se puede eliminar aparte si lo prefieren).
- No se toca la agenda, el RPC, datos, emails ni se publica.
- No se cambia el comportamiento de selección múltiple por rol en la agenda.

## Verificación
- Build sin errores.
- Preview: abrir "Nuevo Turno" desde el FAB → sin selector, botón habilitado al completar paciente y profesional.
- Abrir desde "Crear cita" en la ficha → mismo resultado.
- Desde una fila (rol Kinesiólogo) → sin selector; el turno se crea en la fila tocada (verificación visual sin crear turnos reales en CTAK; solo en tenants demo si me lo autorizan).
