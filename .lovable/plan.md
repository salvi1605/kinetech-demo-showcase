

## Fix: Hacer que la selección de rol realmente restrinja la experiencia

### Problema
Cuando un Super Admin elige entrar como "Kinesiólogo" o "Recepcionista", el flag `state.isSuperAdmin` permanece en `true` y nunca se resetea al seleccionar un rol específico. Esto causa que:
- La UI siga mostrando opciones de Super Admin (botón dashboard, crear clínica, etc.)
- `RoleGuard` funciona parcialmente (chequea `state.userRole`), pero otros componentes usan `state.isSuperAdmin` directamente
- Las RLS policies en la BD siempre devuelven `true` para `is_super_admin()` — esto NO se puede cambiar sin cambiar de cuenta

### Alcance realista
La restricción a nivel de **base de datos (RLS)** NO es posible sin usar una cuenta diferente — las funciones SQL como `is_super_admin()` evalúan el `auth.uid()` real. Pero sí podemos hacer que la **experiencia de UI sea fiel al rol seleccionado**, que es lo que necesitás para testear vistas.

### Cambios

**1. `src/contexts/AppContext.tsx` — Nuevo concepto: `effectiveRole` vs `isSuperAdmin`**
- Agregar un nuevo campo `isImpersonatingRole: boolean` al estado
- Cuando `SET_USER_ROLE` se despacha con un rol que NO es `super_admin`, setear `isImpersonatingRole = true`
- Crear un getter/helper `effectiveIsSuperAdmin` que retorna `state.isSuperAdmin && !state.isImpersonatingRole`
- Actualizar `SET_USER_ROLE` en el reducer para setear `isImpersonatingRole` cuando el rol elegido difiere de `super_admin`

**2. Reemplazar `state.isSuperAdmin` por el flag efectivo en componentes de UI**
- `src/components/layout/Topbar.tsx` — Ocultar botón "Dashboard Super Admin" si está impersonando otro rol
- `src/components/shared/AuthRouteGuard.tsx` — No redirigir a `/super-admin` si está impersonando
- `src/components/shared/PublicRouteGuard.tsx` — Misma lógica
- `src/pages/SelectClinic.tsx` — Mantener: siempre mostrar todos los roles (esto está bien)

**3. `src/components/shared/RoleGuard.tsx` — Ya funciona correctamente**
- Actualmente chequea `state.userRole`, que sí se setea al rol elegido. No requiere cambios.

**4. `src/components/layout/AppSidebar.tsx` — Verificar que usa `state.userRole`**
- Confirmar que los items del menú se filtran por `state.userRole` y no por `state.isSuperAdmin`

### Resultado esperado
- Elegís "Kinesiólogo" → ves exactamente la misma UI que vería un kinesiólogo real (sin botones de admin, sin acceso a configuración, etc.)
- Los datos de la BD seguirán siendo accesibles (porque RLS no cambia), pero la UI estará completamente restringida al rol elegido
- Desde el Topbar siempre podés volver al dashboard de Super Admin o cambiar de clínica/rol

### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/contexts/AppContext.tsx` | Agregar `isImpersonatingRole`, actualizar reducer |
| `src/components/layout/Topbar.tsx` | Usar flag efectivo en vez de `isSuperAdmin` |
| `src/components/shared/AuthRouteGuard.tsx` | Usar flag efectivo |
| `src/components/shared/PublicRouteGuard.tsx` | Usar flag efectivo |
| `src/components/layout/AppSidebar.tsx` | Verificar que usa `userRole` |

### Limitación conocida
Los datos de la base de datos NO se restringen — las RLS policies siempre reconocen al super_admin real. Para probar restricciones de datos reales, se necesita usar las cuentas de Thelma o Gerardo.

