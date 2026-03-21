

# Fix: Visibilidad del botón de eliminación múltiple en móvil

## Problema probable
En pantallas pequeñas (376px), el contenido del dialog "Liberar Cita" (info del turno + lista de checkboxes + botones de acción) excede el viewport. El botón "Eliminación Múltiple" queda fuera del área visible, y la usuaria solo vio "Eliminar turno actual", forzándola a eliminar uno por uno.

## Cambios — archivo único: `src/components/dialogs/FreeAppointmentDialog.tsx`

### 1. Reorganizar layout del dialog para móvil
- Envolver el contenido scrollable (`lista de turnos`) en un contenedor con `max-h` limitado, pero mantener los **botones de acción siempre visibles** fuera del área scrollable (sticky en la parte inferior del dialog).
- Mover los botones "Eliminar turno actual" y "Eliminación Múltiple" al `DialogFooter`, reemplazando el botón "Cancelar" suelto actual.

### 2. Priorizar visualmente la eliminación múltiple
- Cuando hay turnos seleccionados (>0), mostrar el botón "Eliminación Múltiple" **antes** del botón "Eliminar turno actual" para que sea lo primero que se vea.
- El botón de eliminar turno actual pasa a ser secundario/outline.

### 3. Reducir altura de la lista en móvil
- Cambiar `max-h-80` (320px) a `max-h-48` (~192px) en móvil para dejar espacio visible a los botones de acción.

### Resultado
Los botones de acción siempre son visibles sin scroll, independientemente de cuántos turnos futuros tenga el paciente.

