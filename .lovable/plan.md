

# Simplificar seleccion de hora: click en "Libre" y listo

## Problema
Actualmente, al hacer click en un slot "Libre" del picker, se actualiza el campo de hora del formulario, pero el usuario todavia ve un `<Select>` de hora separado debajo. Esto genera confusion: parece que hay que hacer dos pasos cuando en realidad uno basta.

## Solucion
Ocultar el `<Select>` de hora cuando el `RescheduleSlotPicker` esta visible (es decir, cuando hay fecha y profesional seleccionados). El click en "Libre" sera la unica accion necesaria para elegir la hora. Se mostrara la hora seleccionada como texto informativo debajo del picker para confirmar visualmente la eleccion.

Si por alguna razon el picker no puede cargarse (sin settings), se mantiene el Select como fallback.

## Cambios

### `src/components/dialogs/AppointmentDetailDialog.tsx`
- Envolver el bloque del `<Select>` de hora en una condicion: solo mostrarlo cuando **no** se muestre el `RescheduleSlotPicker` (cuando faltan fecha o practitioner)
- Agregar un pequeno texto debajo del picker que muestre "Hora seleccionada: HH:mm" para feedback visual claro
- El picker ya llama `form.setValue('startTime', time)` al hacer click, asi que no hace falta cambiar nada mas en la logica

## Resultado
El usuario cambia fecha, ve la grilla, hace click en "Libre" y la hora queda seleccionada. Un solo paso, sin dropdown extra.
