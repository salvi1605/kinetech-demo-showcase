

# Diagnostico y Plan de Estabilizacion del Sistema

## Problemas Identificados

### 1. Sesiones que se rompen (conexion al sistema)

El error principal en los logs es: **"Invalid Refresh Token: Refresh Token Not Found"**. Esto significa que cuando un usuario deja la aplicacion abierta un tiempo, el token de sesion expira y el sistema no puede renovarlo. El resultado: el usuario queda desconectado sin aviso claro, o la aplicacion se comporta de forma erratica al intentar hacer llamadas al backend sin autorizacion.

Ademas, el proceso de inicio de sesion ejecuta la logica de autenticacion **dos veces** (una en `onAuthStateChange` y otra en `getSession`), duplicando llamadas al backend innecesariamente.

### 2. Calendario que titila (rendimiento)

Cada vez que llega una actualizacion en tiempo real (otro usuario crea o modifica un turno), el calendario:

- Reconstruye **dos mapas de indices** completos iterando TODAS las citas (lineas 150-191 de Calendar.tsx) en cada render
- Despacha `SET_APPOINTMENTS` al contexto global, lo cual causa un re-render en cascada de toda la aplicacion
- Sincroniza profesionales y pacientes desde la BD al contexto global en cada render del calendario

Este ciclo se repite con cada cambio en tiempo real, causando el efecto de "titileo" visible.

### 3. Lentitud general

- Llamadas dobles al backend durante la autenticacion (edge function `ensure-public-user` se llama 2 veces)
- Reconstruccion de indices en cada render sin memoizacion
- Sincronizacion de datos BD-a-Context que dispara renders innecesarios

---

## Plan de Solucion (3 cambios principales)

### Cambio 1: Manejo robusto de sesiones expiradas

**Archivo:** `src/contexts/AppContext.tsx`

- Eliminar la logica duplicada: `getSession()` ya no ejecutara el bootstrap completo. Solo `onAuthStateChange` se encargara de la autenticacion.
- Cuando el refresh token falle, limpiar la sesion local correctamente y redirigir al login con un mensaje claro ("Tu sesion ha expirado, por favor inicia sesion nuevamente").
- Agregar manejo de errores en `onAuthStateChange` para el evento `TOKEN_REFRESHED` fallido, evitando que la app quede en estado intermedio.

### Cambio 2: Memoizar indices del calendario

**Archivo:** `src/pages/Calendar.tsx`

- Envolver los mapas de indices (`allAppointmentsBySlotKey` y `appointmentsBySlotKey`) en `useMemo`, recalculandolos solo cuando `dbAppointments`, `state.filterPractitionerId` o `state.filterPatientSearch` cambien.
- Envolver `filteredAppointments` en `useMemo` para evitar recalculos innecesarios.
- Memoizar las funciones auxiliares (`getAppointmentsForSlot`, `getSlotCapacity`, etc.) con `useCallback`.

### Cambio 3: Evitar sincronizacion innecesaria BD-a-Context

**Archivo:** `src/pages/Calendar.tsx`

- Los `useEffect` que sincronizan `dbPractitioners` y `dbPatients` al AppContext (lineas 87-98) disparan renders en cascada. Se agregara una comparacion de referencia para evitar despachar si los datos no cambiaron realmente.
- El `useEffect` que despacha `SET_APPOINTMENTS` (linea 145-147) se protegera con una comparacion por longitud y referencia para evitar dispatches redundantes.

---

## Detalle Tecnico

### Cambio 1 - Auth (AppContext.tsx)

```text
Antes:
  onAuthStateChange -> bootstrap completo
  getSession -> bootstrap completo (duplicado)

Despues:
  onAuthStateChange -> bootstrap completo (unica fuente)
  getSession -> solo verificar si hay sesion, dejar que onAuthStateChange maneje el resto
  
  Error de refresh token -> signOut limpio + dispatch LOGOUT + toast informativo
```

Se agrega deteccion explicita del evento `TOKEN_REFRESHED` fallido y se trata el error `refresh_token_not_found` cerrando la sesion limpiamente en lugar de dejar la app en un estado roto.

### Cambio 2 - Memoizacion (Calendar.tsx)

```text
// Antes (se ejecuta en CADA render):
const allAppointmentsBySlotKey = new Map();
dbAppointments.forEach(...)

// Despues (solo se recalcula cuando cambian las dependencias):
const allAppointmentsBySlotKey = useMemo(() => {
  const map = new Map();
  dbAppointments.forEach(...)
  return map;
}, [dbAppointments]);

const filteredAppointments = useMemo(() => {
  return dbAppointments.filter(...)
}, [dbAppointments, state.filterPractitionerId, state.filterPatientSearch, state.patients]);

const appointmentsBySlotKey = useMemo(() => {
  const map = new Map();
  filteredAppointments.forEach(...)
  return map;
}, [filteredAppointments]);
```

### Cambio 3 - Sincronizacion protegida (Calendar.tsx)

```text
// Antes:
useEffect(() => {
  if (dbPractitioners.length > 0) {
    dispatch({ type: 'SET_PRACTITIONERS', payload: dbPractitioners });
  }
}, [dbPractitioners, dispatch]);

// Despues:
const prevPractitionersRef = useRef(dbPractitioners);
useEffect(() => {
  if (dbPractitioners.length > 0 && dbPractitioners !== prevPractitionersRef.current) {
    prevPractitionersRef.current = dbPractitioners;
    dispatch({ type: 'SET_PRACTITIONERS', payload: dbPractitioners });
  }
}, [dbPractitioners, dispatch]);
```

Mismo patron para `dbPatients` y `dbAppointments`.

---

## Archivos a modificar

1. `src/contexts/AppContext.tsx` - Eliminar bootstrap duplicado, manejar refresh token expirado
2. `src/pages/Calendar.tsx` - Memoizar indices, proteger sincronizaciones

## Impacto esperado

- Los usuarios ya no quedaran "trabados" con sesiones rotas: se les redirigira al login con mensaje claro
- El calendario dejara de titilar porque los re-renders seran minimos
- La velocidad general mejorara al eliminar llamadas dobles y recalculos innecesarios
- Las actualizaciones en tiempo real seguiran funcionando pero sin causar cascadas de renders

