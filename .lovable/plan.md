

# Slot "Libre" se convierte en "Actual" al hacer click

## Problema
Cuando el usuario hace click en un slot "Libre", abajo aparece un texto "Hora seleccionada: HH:mm", pero no hay cambio visual en la grilla misma. Seria mas intuitivo que el slot clickeado cambie su apariencia a "Actual" (estilo azul con borde), igual que la cita original.

## Solucion

### `src/components/shared/RescheduleSlotPicker.tsx`
- En el render de sub-slots libres, agregar una condicion: si `slot.time === selectedTime`, renderizar el boton con el estilo "Actual" (borde azul, fondo azul claro, texto "Actual") en lugar de "Libre"
- El boton sigue siendo clickeable (por si quiere deseleccionar o re-confirmar)
- Solo el **primer sub-slot libre** de esa hora se marca como "Actual" para no confundir con multiples marcas

### `src/components/dialogs/AppointmentDetailDialog.tsx`
- Eliminar el texto "Hora seleccionada: HH:mm" con el icono de reloj, ya que la grilla misma muestra la seleccion visualmente
- Eliminar la importacion de `Clock` si ya no se usa en otro lugar del componente

## Resultado
Click en "Libre" -> el slot cambia a "Actual" instantaneamente. Sin texto extra, flujo 100% visual.
