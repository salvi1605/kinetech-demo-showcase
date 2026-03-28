

## DatePicker: navegar al día exacto en móvil

### Problema
En móvil, el DatePicker siempre muestra el lunes de la semana seleccionada porque `WeekNavigatorCompact` solo despacha `SET_CALENDAR_WEEK`. El tab de día (`selectedDay` en Calendar.tsx) no se actualiza.

### Solución
Agregar un callback opcional `onDateSelect` a `WeekNavigatorCompact` que informe qué fecha exacta eligió el usuario. Calendar.tsx usa ese callback para cambiar el tab al día correcto (Lun=0..Vie=4), enviando sábados/domingos al lunes de esa semana.

### Cambios

**`src/components/navigation/WeekNavigatorCompact.tsx`**
- Agregar prop `onDateSelect?: (date: Date) => void`
- Llamar `onDateSelect(date)` dentro de `navigateToDate` cuando venga del calendario o del botón "Hoy"

**`src/pages/Calendar.tsx`**
- Pasar `onDateSelect` a `WeekNavigatorCompact`
- En el callback: calcular el día de la semana (getDay), mapear 1=0, 2=1...5=4; si es 0 (dom) o 6 (sáb) → 0 (lunes)
- Llamar `changeMobileDay(dayIndex)` para actualizar el tab

### Sin impacto
- Desktop sigue funcionando igual (no usa `selectedDay`)
- Las flechas prev/next no disparan `onDateSelect` (mantienen comportamiento actual)

