

# Reprogramacion: feedback completo y navegacion automatica

## Problema actual
Cuando se reprograma una cita, el dialogo permanece abierto mostrando los datos viejos. El usuario debe cerrar y reabrir para ver los cambios. Ademas, el calendario no navega a la nueva fecha/hora.

## Cambios

### `src/components/dialogs/AppointmentDetailDialog.tsx` - funcion `onSubmit`

Despues de una reprogramacion exitosa (cuando la fecha o hora cambiaron):

1. **Toast descriptivo**: Cambiar el mensaje de exito para incluir la nueva fecha y hora. Ejemplo: "Turno reprogramado al Lunes 3 de Marzo a las 10:00"

2. **Navegar el calendario a la nueva semana**: Usar `dispatch({ type: 'SET_CALENDAR_WEEK', payload: weekStartISO })` con la semana de la nueva fecha para que el calendario muestre la semana correcta

3. **Cerrar el dialogo**: Llamar `onOpenChange(false)` inmediatamente despues del exito, para que el usuario vea el calendario actualizado

4. **Disparar el evento**: Mantener `window.dispatchEvent(new Event('appointmentUpdated'))` para que Calendar.tsx haga refetch

### Detalle tecnico del flujo post-reprogramacion

```text
onSubmit exitoso
  |
  +--> Detectar si fecha/hora/profesional cambio
  |
  +--> SI cambio (reprogramacion):
  |      - Toast: "Turno reprogramado al [fecha] a las [hora]"
  |      - dispatch SET_CALENDAR_WEEK con lunes de la nueva semana
  |      - onOpenChange(false) para cerrar dialogo
  |      - dispatchEvent('appointmentUpdated') para refetch
  |
  +--> NO cambio (edicion de estado/notas):
         - Toast generico actual
         - setIsEditing(false) sin cerrar dialogo
```

### Imports necesarios
- Agregar `startOfWeek` de date-fns (si no esta importado ya)
- Usar `parseLocalDate` ya importado para parsear la nueva fecha

## Resultado
Al reprogramar: toast con "Turno reprogramado al Martes 4 de Marzo a las 09:30", el dialogo se cierra, y el calendario salta automaticamente a la semana y muestra la cita en su nuevo horario.
