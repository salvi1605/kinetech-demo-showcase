
# Cierre de sesion automatico por inactividad (60 minutos)

## Resumen

Se implementara un sistema que detecta cuando el usuario no interactua con la aplicacion durante 60 minutos consecutivos y cierra la sesion automaticamente, mostrando un aviso claro.

---

## Como funciona

- Se monitorean eventos de actividad del usuario: clicks, teclas, movimiento de mouse, scroll y toques en pantalla
- Cada vez que el usuario interactua, se reinicia un temporizador de 60 minutos
- Si pasan 60 minutos sin ninguna interaccion, se cierra la sesion y se redirige al login
- 5 minutos antes del cierre (al minuto 55), se muestra un aviso tipo toast: "Tu sesion se cerrara en 5 minutos por inactividad"

---

## Archivos a crear/modificar

### 1. Nuevo hook: `src/hooks/useInactivityLogout.ts`

Hook reutilizable que:

- Registra listeners de eventos de actividad del usuario (click, keydown, mousemove, scroll, touchstart)
- Mantiene un timer de 60 minutos (configurable)
- A los 55 minutos muestra un toast de advertencia
- A los 60 minutos ejecuta `supabase.auth.signOut()` y despacha `LOGOUT`
- Limpia listeners y timers al desmontarse

### 2. Modificar: `src/contexts/AppContext.tsx`

- Invocar `useInactivityLogout` dentro del `AppProvider`, activo solo cuando `state.isAuthenticated` es `true`

---

## Detalle tecnico

### Hook useInactivityLogout

```text
Constantes:
  INACTIVITY_TIMEOUT = 60 * 60 * 1000  (60 min en ms)
  WARNING_BEFORE = 5 * 60 * 1000       (5 min antes)

Eventos monitoreados:
  ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']

Logica:
  1. Al montar (si isAuthenticated=true):
     - Registrar listeners en window para todos los eventos
     - Iniciar timer de (TIMEOUT - WARNING) = 55 min para mostrar toast
     - Iniciar timer de TIMEOUT = 60 min para signOut

  2. Cada interaccion del usuario:
     - Limpiar ambos timers
     - Reiniciar ambos timers

  3. Al llegar a 55 min sin actividad:
     - Mostrar toast: "Tu sesion se cerrara en 5 minutos por inactividad"

  4. Al llegar a 60 min sin actividad:
     - supabase.auth.signOut()
     - dispatch({ type: 'LOGOUT' })
     - toast: "Sesion cerrada por inactividad"

  5. Al desmontar o cuando isAuthenticated=false:
     - Limpiar todos los listeners y timers

  Optimizacion:
     - Los listeners de mousemove usan throttle (1 evento cada 30 seg)
       para no reiniciar timers con cada pixel de movimiento
```

### Integracion en AppProvider

Se agrega la llamada al hook dentro del componente `AppProvider`, pasandole `state.isAuthenticated` y `dispatch`.
