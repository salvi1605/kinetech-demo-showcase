

## Plan: Agregar header con menú hamburguesa al Panel Super Admin

### Problema
La ruta `/super-admin` renderiza `SuperAdminDashboard` fuera de `AppLayout`, por lo que no tiene Topbar ni menú hamburguesa. El usuario no puede cerrar sesión ni navegar desde esa pantalla en móvil.

### Solución
Agregar un header compacto dentro de `SuperAdminDashboard` con:
- Logo/título "AgendixPro"
- En **mobile**: botón hamburguesa que abre un `Sheet` con opciones: "Cambiar Clínica", "Cerrar sesión"
- En **desktop**: mostrar email del usuario, botón "Cambiar Clínica" y "Cerrar sesión" inline

### Archivo a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/SuperAdminDashboard.tsx` | Agregar un header fijo al inicio del componente con navegación y logout, usando `Sheet` para móvil y botones inline para desktop. Reutiliza el patrón del `Topbar.tsx` existente. |

### Detalle técnico
- Importar `Sheet`, `SheetContent`, `SheetTrigger`, `Menu`, `LogOut`, `Building` de los componentes existentes
- Usar `useIsMobile()` para condicionar la vista
- Incluir `supabase.auth.signOut()` + `dispatch({ type: 'LOGOUT' })` para cerrar sesión
- Botón "Cambiar Clínica" navega a `/select-clinic`
- El header será un `<header>` sticky con la misma estética que el Topbar principal (`h-14 border-b bg-card shadow-sm`)

