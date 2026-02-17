

# Correccion del parpadeo del calendario

## Problema raiz

El parpadeo que se ve en el video ocurre porque cada vez que llega una actualizacion en tiempo real (otro usuario crea/modifica un turno), sucede lo siguiente:

1. El hook `useAppointmentsForClinic` ejecuta `setIsLoading(true)` al inicio de cada refetch
2. El calendario muestra un esqueleto de carga (pantalla gris/animada) durante medio segundo
3. Los datos llegan, `setIsLoading(false)`, y el calendario se vuelve a dibujar

Ese ciclo **calendario visible -> esqueleto de carga -> calendario visible** es el parpadeo. Ocurre cada vez que cualquier usuario del sistema modifica un turno.

Ademas, cada refetch crea un array de citas completamente nuevo en memoria, lo que invalida todas las protecciones de referencia que se agregaron antes.

---

## Solucion

### Cambio 1: Eliminar el skeleton en refetches de tiempo real

**Archivo:** `src/hooks/useAppointmentsForClinic.ts`

- Separar el concepto de "carga inicial" vs "actualizacion silenciosa"
- Solo mostrar `isLoading = true` en la primera carga o al cambiar de semana/clinica
- Las actualizaciones en tiempo real (realtime) actualizan los datos sin activar el skeleton
- Se agrega un parametro `silent` a `fetchAppointments` que evita `setIsLoading(true)`

### Cambio 2: Estabilizar la referencia del array de citas

**Archivo:** `src/hooks/useAppointmentsForClinic.ts`

- Antes de llamar `setAppointments(newData)`, comparar el contenido con el estado actual
- Si los datos son identicos (mismos IDs, mismos estados), no actualizar el estado
- Esto evita re-renders innecesarios cuando el evento de tiempo real no trae cambios reales

### Cambio 3: Memoizar weekDates en Calendar

**Archivo:** `src/pages/Calendar.tsx`

- La funcion `getWeekDates()` se ejecuta en cada render y crea objetos Date nuevos
- Envolver en `useMemo` dependiendo de `state.calendarWeekStart`

---

## Detalle tecnico

### useAppointmentsForClinic.ts - Refetch silencioso

```text
Antes:
  fetchAppointments() -> setIsLoading(true) -> fetch -> setAppointments -> setIsLoading(false)
  (realtime llega) -> fetchAppointments() -> SKELETON VISIBLE -> datos -> grid visible

Despues:
  fetchAppointments(silent=false) -> setIsLoading(true) -> fetch -> setAppointments -> setIsLoading(false)  [solo carga inicial]
  (realtime llega) -> fetchAppointments(silent=true) -> fetch -> setAppointments (SIN skeleton)
```

La suscripcion de realtime llamara a `fetchAppointments(true)` (silencioso), mientras que el `useEffect` de carga inicial y cambio de semana usara `fetchAppointments(false)`.

### useAppointmentsForClinic.ts - Comparacion de contenido

```text
// Antes de setAppointments, comparar IDs + estados
const hasChanged = (prev, next) => {
  if (prev.length !== next.length) return true;
  return prev.some((apt, i) => apt.id !== next[i].id || apt.status !== next[i].status || apt.subSlot !== next[i].subSlot);
};

if (hasChanged(currentAppointments, mappedAppointments)) {
  setAppointments(mappedAppointments);
}
```

### Calendar.tsx - weekDates memoizado

```text
const weekDates = useMemo(() => {
  const currentWeek = state.calendarWeekStart
    ? new Date(state.calendarWeekStart + 'T00:00:00')
    : new Date();
  const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
  return Array.from({ length: 5 }, (_, i) => addDays(start, i));
}, [state.calendarWeekStart]);
```

---

## Archivos a modificar

1. `src/hooks/useAppointmentsForClinic.ts` - Refetch silencioso + comparacion de contenido
2. `src/pages/Calendar.tsx` - Memoizar weekDates

## Resultado esperado

- El calendario ya NO parpadea cuando otro usuario modifica turnos
- Los datos se actualizan en tiempo real de forma invisible (sin skeleton)
- El skeleton solo aparece en la carga inicial o al cambiar de semana
