
# Correccion de carga de datos y parpadeo del calendario

## Problema 1: Datos no se muestran en la primera visita

### Causa raiz

Los hooks de datos (`usePatients`, `usePractitioners`, etc.) dependen de `clinicId`. Cuando se navega a una pagina, el hook se ejecuta correctamente, pero el patron de sincronizacion con AppContext causa renders innecesarios que "borran" los datos temporalmente.

En `Patients.tsx` (linea 47), se usa `state.patients` en vez de `dbPatients` directamente. El flujo es:

```text
1. Componente monta -> usePatients(clinicId) ejecuta fetch
2. dbPatients se llena con datos de BD
3. useEffect dispara dispatch SET_PATIENTS -> re-render
4. state.patients se actualiza
```

El problema es que `state.patients` empieza vacio y se llena solo despues del dispatch. Si hay un re-render intermedio (por otro dispatch como SET_PRACTITIONERS), se puede ver momentaneamente la lista vacia.

En `Exceptions.tsx`, el problema es diferente: usa `fetchData` dentro de un `useCallback` que depende de `clinicId`. Si `clinicId` cambia (por ejemplo, se establece despues del auth bootstrap), el callback se recrea pero hay una ventana donde el efecto no se ha re-ejecutado.

### Solucion

**Archivos: `src/pages/Patients.tsx`, `src/pages/Exceptions.tsx`**

1. En `Patients.tsx`: usar `dbPatients` directamente para el filtrado/renderizado en lugar de `state.patients`. Mantener el dispatch a AppContext para que otros componentes accedan a los datos, pero no depender de el para la vista local.

2. En `Exceptions.tsx`: agregar un estado `initialLoaded` para distinguir entre "cargando por primera vez" y "ya cargado". Si `clinicId` no esta disponible al montar, esperar sin mostrar "vacio".

---

## Problema 2: Parpadeo del calendario

### Causa raiz

El calendario tiene 3 cadenas de `useEffect` + `dispatch` que causan re-renders en cascada:

```text
Render 1: Componente monta, hooks inician fetch
Render 2: dbPractitioners llega -> dispatch SET_PRACTITIONERS
Render 3: dbPatients llega -> dispatch SET_PATIENTS  
Render 4: dbAppointments llega -> dispatch SET_APPOINTMENTS
```

Cada dispatch causa un re-render completo del calendario. Ademas:

- Las comparaciones por referencia (`dbPractitioners !== prevPractitionersRef.current`) siempre son `true` porque cada fetch crea un nuevo array, incluso si los datos son identicos.
- El `refetch` publico (linea 153) usa `silent = false`, lo que activa el skeleton de carga visible.
- El useEffect en linea 212-232 (clean past selections) depende de `state.selectedSlots` y `dispatch`, creando potenciales ciclos de actualizacion.

### Solucion

**Archivo: `src/pages/Calendar.tsx`**

1. **Comparacion profunda para evitar dispatches redundantes**: Reemplazar la comparacion por referencia de practitioners y patients con una comparacion por contenido (similar a `hasDataChanged` en useAppointmentsForClinic).

```text
// Antes (siempre true con arrays nuevos):
if (dbPractitioners !== prevPractitionersRef.current)

// Despues (solo true si datos realmente cambiaron):
if (hasPractitionerDataChanged(prevPractitionersRef.current, dbPractitioners))
```

2. **Eliminar dispatches innecesarios**: Los dispatches SET_PRACTITIONERS y SET_PATIENTS desde Calendar son redundantes si las paginas individuales (Patients, Practitioners) ya lo hacen. Pero como Calendar es la pagina principal, mantenerlos con la proteccion de comparacion profunda.

3. **Estabilizar el useEffect de limpieza de seleccion** (lineas 212-232): solo ejecutar cuando `calendarWeekStart` cambia, no cuando `selectedSlots` cambia (evita ciclos).

**Archivo: `src/hooks/useAppointmentsForClinic.ts`**

4. **Refetch publico silencioso por defecto**: Cambiar linea 153 para que el refetch publico sea silencioso, evitando mostrar skeleton al refrescar datos.

```text
// Antes:
const refetch = useCallback(() => fetchAppointments(false), [fetchAppointments]);

// Despues:
const refetch = useCallback(() => fetchAppointments(true), [fetchAppointments]);
```

---

## Detalle tecnico

### Cambios en `src/pages/Calendar.tsx`

1. Lineas 88-94 (sync practitioners): Agregar funcion `hasPractitionerDataChanged` que compara por `id` y `name` y `color`.

2. Lineas 96-103 (sync patients): Agregar funcion `hasPatientDataChanged` que compara por `id` y `name`.

3. Lineas 212-232 (clean past selections): Reducir dependencias del useEffect a solo `state.calendarWeekStart`.

### Cambios en `src/pages/Patients.tsx`

1. Linea 47: Cambiar `const patients = state.patients` a `const patients = dbPatients` para renderizado directo.
2. Mantener el useEffect de sincronizacion (lineas 42-44) para que otros componentes accedan a los datos.

### Cambios en `src/pages/Exceptions.tsx`

1. Agregar proteccion contra estado vacio inicial: si `loading` es true y no hay datos previos, mostrar skeleton en lugar de "Cargando...".

### Cambios en `src/hooks/useAppointmentsForClinic.ts`

1. Linea 153: Cambiar `fetchAppointments(false)` a `fetchAppointments(true)` para que el refetch sea silencioso.

### Funciones auxiliares nuevas (en Calendar.tsx)

```text
hasPractitionerDataChanged(prev, next):
  Si longitudes difieren -> true
  Comparar id, name, color de cada elemento
  Si algun campo difiere -> true
  Sino -> false

hasPatientDataChanged(prev, next):
  Si longitudes difieren -> true
  Comparar id, name de cada elemento
  Si algun campo difiere -> true
  Sino -> false
```

### Resultado esperado

- Las paginas de pacientes y excepciones mostraran datos inmediatamente en la primera visita
- El calendario no parpadeara al cambiar de semana ni al recibir actualizaciones en tiempo real
- Los skeletons solo apareceran en la carga inicial, no en refrescos posteriores
