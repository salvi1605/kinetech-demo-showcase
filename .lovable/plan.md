

## Pantalla de sesión expirada amigable

### Problema actual
Cuando la sesión expira (por inactividad, token inválido, etc.), el sistema hace `signOut` + `dispatch({ type: 'LOGOUT' })` directamente, lo que muestra brevemente el skeleton de carga y redirige a `/login` sin explicación clara. El usuario no entiende por qué fue desconectado.

### Solución

Crear una página intermedia `/session-expired` que muestre un mensaje amigable antes de ir al login.

### Cambios

**1. Nueva página `src/pages/SessionExpired.tsx`**
- Card centrada con icono de reloj/candado
- Título: "Tu sesión ha expirado"
- Descripción: "Por tu seguridad, cerramos la sesión automáticamente. Esto puede ocurrir por inactividad o porque tu sesión dejó de ser válida."
- Botón "Iniciar sesión" que navega a `/login`
- Acepta un query param `?reason=inactivity|expired` para personalizar el mensaje (inactividad vs expiración general)

**2. Registrar ruta en `src/App.tsx`**
- Agregar ruta pública `/session-expired` → `<SessionExpired />`

**3. Actualizar `src/hooks/useInactivityLogout.ts`**
- Después de `signOut` + `dispatch LOGOUT`, usar `window.location.replace('/session-expired?reason=inactivity')` en lugar de dejar que el guard redirija a `/login`

**4. Actualizar `src/contexts/AppContext.tsx`**
- En los puntos donde se detecta token expirado/inválido (refresh_token_not_found, bootstrap retry failed), después del signOut+LOGOUT, agregar `window.location.replace('/session-expired?reason=expired')`
- Afecta ~4 bloques: retry de ensure-public-user, clinicsResult null, catch general del bootstrap, y TOKEN_REFRESHED sin session

**5. Actualizar `src/components/shared/AuthRouteGuard.tsx`**
- Permitir que `/session-expired` no redirija a `/login` (ya es ruta pública, no pasa por AuthRouteGuard)

### Sin impacto
- Login manual y logout voluntario siguen yendo a `/login` como siempre
- Solo las expiraciones automáticas pasan por `/session-expired`

