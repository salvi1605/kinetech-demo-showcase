

## DatePicker en el navegador de semanas

### Resumen
Agregar un DatePicker (calendario desplegable) al `WeekNavigatorCompact` que permita seleccionar cualquier fecha para navegar directamente a la semana que la contiene. Incluir un botón "Hoy" dentro del popover para saltar a la semana actual.

### Cambios

**Archivo: `src/components/navigation/WeekNavigatorCompact.tsx`**
- Envolver el label de semana actual en un `Popover` + `PopoverTrigger`
- Dentro del `PopoverContent`, renderizar el componente `Calendar` (shadcn) en modo `single`
- Al seleccionar una fecha (`onSelect`): calcular el lunes de esa semana con `startOfWeek(date, {weekStartsOn:1})`, formatear a ISO, y hacer `dispatch({ type: 'SET_CALENDAR_WEEK', payload })`. Cerrar el popover.
- Agregar un botón "Hoy" debajo del calendario que haga lo mismo pero con `new Date()`
- Resaltar visualmente la semana actual en el calendario usando la prop `selected` con el rango weekStart–weekEnd
- Agregar `pointer-events-auto` al className del Calendar (requerido para funcionar dentro de popovers)
- Agregar un ícono pequeño de calendario (`CalendarIcon` de lucide) junto al label para indicar que es clickeable

**Archivo: `src/components/navigation/WeekNavigator.tsx`**
- Aplicar los mismos cambios por consistencia (aunque actualmente no se usa, mantenerlo sincronizado)

### Lo que NO se toca
- `AppContext.tsx` — la acción `SET_CALENDAR_WEEK` ya existe y funciona
- `Calendar.tsx` (página) — no se modifica, consume `WeekNavigatorCompact` sin cambios de interfaz
- Ningún otro componente, hook, o utilidad

### Detalle técnico
- Imports nuevos en WeekNavigatorCompact: `Popover`, `PopoverTrigger`, `PopoverContent`, `Calendar`, `CalendarIcon`, `useState`
- Estado local `open` para controlar el popover
- El botón "Hoy" usa `variant="outline"` tamaño `sm`, texto "Hoy", cierra el popover al hacer click

