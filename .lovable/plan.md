

## Sub-slot picker en NewAppointmentDialog

### Idea
Cuando el usuario hace click en "+" o en una celda del calendario para crear una cita nueva, en lugar de auto-asignar el sub_slot silenciosamente (que fue la causa del bug), mostrar un mini-picker **solo para ese bloque horario** dentro del diálogo de nueva cita. Similar al que ya existe en `RescheduleSlotPicker`, pero acotado a un solo horario.

### Qué se ve el usuario
Debajo del selector de hora en `NewAppointmentDialog`, aparece una fila horizontal con los sub-slots del bloque seleccionado (ej: 15:30):

```text
Sub-slot:  [Ocupado] [Libre ✓] [Libre] [Libre] [Libre]
              1         2         3       4       5
```

- Los ocupados se muestran en gris (no clickeables)
- Los bloqueados en rojo
- Los libres en verde (clickeables)
- El pre-seleccionado (el que clickeó en el calendario) tiene borde destacado
- Si el pre-seleccionado resulta estar ocupado, se auto-selecciona el primer libre

### Cambios técnicos

#### 1. Nuevo componente: `SubSlotPicker.tsx`
- Props: `clinicId`, `practitionerId`, `date`, `startTime`, `selectedSubSlot`, `onSelect`
- Consulta `appointments` para ese practitioner+date+startTime (no canceladas) → arma mapa de ocupados
- Consulta `schedule_exceptions` para ver si hay bloqueo en ese horario
- Renderiza una fila de botones (1 a `sub_slots_per_block` de clinic_settings)
- Componente ligero, solo consulta un bloque, no todo el día

#### 2. Integrar en `NewAppointmentDialog.tsx`
- Agregar `SubSlotPicker` debajo del selector de hora
- El sub_slot seleccionado se guarda en estado local (`selectedSubSlot`)
- Al enviar el form, usa ese valor directamente (ya es 1-indexed, sin conversiones)
- Si cambia practitioner o hora, el picker se recarga automáticamente
- Eliminar la línea `const subSlot = (selectedSlot.subSlot ?? 0) + 1` — el picker lo maneja

#### 3. Validación
- El botón "Crear" se deshabilita si no hay sub_slot seleccionado
- Si todos los sub-slots están ocupados, se muestra mensaje "Sin disponibilidad en este horario"

### Archivos
| Archivo | Cambio |
|---|---|
| `src/components/shared/SubSlotPicker.tsx` | Nuevo componente |
| `src/components/dialogs/NewAppointmentDialog.tsx` | Integrar picker, eliminar auto-asignación |

### Resultado
- El usuario siempre ve qué sub-slots están libres antes de crear
- Imposible crear en un sub-slot ocupado (el botón no existe)
- Elimina toda conversión 0-indexed/1-indexed — el picker ya trabaja con valores de DB
- Reutiliza el patrón visual probado del `RescheduleSlotPicker`

