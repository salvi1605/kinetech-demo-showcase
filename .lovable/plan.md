## Diagnóstico técnico

**Síntoma:** Al hacer clic en CTAK desde `/select-clinic`, aparece el toast "Accediendo a CTAK…", la app navega a `/calendar` y de inmediato es expulsada a `/super-admin`. Ocurre con cualquier clínica para el `super_admin` raíz.

**Causa raíz (confirmada por código):** En `src/contexts/AppContext.tsx` líneas **943‑966**, el bootstrap de sesión tiene un *early return* para super_admin que **sobreescribe `currentClinicId` a `undefined`** y nunca consulta la clínica/rol persistido en `sessionStorage` por `setSelectedRole(...)`.

Flujo del bug:
1. `SelectClinic.handleSelectClinic` hace:
   - `setSelectedRole({ clinicId: ctak, roleId: 'super_admin' })` en sessionStorage
   - `dispatch(SET_CURRENT_CLINIC { id: ctak })`
   - `navigate('/calendar')` tras 800ms.
2. Cualquier disparo de `onAuthStateChange` (`INITIAL_SESSION`, `TOKEN_REFRESHED`, foco de pestaña, etc.) re-ejecuta el bootstrap → entra al bloque super_admin (línea 944) → `LOGIN { clinicId: undefined }` → `return` **antes** de la sección de restauración (líneas 968‑991).
3. `AuthRouteGuard` evalúa `state.isSuperAdmin && !state.currentClinicId` → `Navigate('/super-admin')`.

**Por qué no afecta a admins normales:** Su bootstrap continúa hasta el bloque de restauración (`getSelectedRole`) en la línea 971, que sí re-aplica la clínica elegida.

## Plan de implementación

Cambio mínimo y localizado en `src/contexts/AppContext.tsx` (un solo archivo, sin tocar UI ni BD).

### Paso 1 — Restaurar la selección persistida para super_admin

En el bloque `if (clinicsResult.isSuperAdmin) { … }` (líneas 943‑966), **antes** del LOGIN sin clínica, intentar restaurar la clínica activa desde `getSelectedRole()`:

```text
if (clinicsResult.isSuperAdmin) {
  const stored = getSelectedRole();   // mover la lógica de líneas 971-991 aquí arriba

  // 1A. Si hay una clínica previamente elegida por el super_admin, restaurarla
  if (stored?.clinicId) {
    // Para super_admin, la clínica puede no estar en clinicsResult.clinics
    // (super_admin no necesita user_roles por clínica). Cargar datos de la clínica
    // directamente desde public.clinics.
    const { data: clinicRow } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('id', stored.clinicId)
      .maybeSingle();

    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', userId)
      .single();

    if (clinicRow && clinicRow.is_active && userData) {
      dispatch({ type: 'LOGIN', payload: {
        id: userData.id, name: userData.full_name, email: userData.email,
        role: (stored.roleId as any) ?? 'super_admin',
        clinicId: clinicRow.id,
      }});
      dispatch({ type: 'SET_CURRENT_CLINIC', payload: { id: clinicRow.id, name: clinicRow.name }});
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      return;
    }
    // Si la clínica ya no existe o está inactiva, limpiar storage
    clearSelectedRole();
  }

  // 1B. Comportamiento actual: super_admin sin clínica elegida → SuperAdmin dashboard
  // (código existente de líneas 945-965 sin cambios)
  …
}
```

### Paso 2 — Evitar persistir `roleId: 'super_admin'` cuando ya existe rol específico

Verificación menor en `SelectClinic.handleSelectClinic`: el código actual ya envía `roleId` desde la tarjeta. No requiere cambio funcional; sólo confirmar que `getSelectedRole()` devuelve el `roleId` correcto que el super_admin eligió (puede ser `'super_admin'` o un rol específico de esa clínica).

### Paso 3 — Validación manual (sin tests automáticos)

1. Login como `salvi1605@gmail.com` (super_admin raíz).
2. En `/select-clinic`, hacer clic en **CTAK → Super Admin**.
3. Verificar: aterriza en `/calendar` y se quedan visibles los 5.241 turnos y 475 pacientes de CTAK.
4. Recargar (F5) → debe permanecer en CTAK sin rebotar a `/super-admin`.
5. Botón **Panel Global** del Topbar → vuelve a `/super-admin` y limpia `currentClinicId` (comportamiento existente).
6. Volver a `/select-clinic` → elegir otra clínica → la nueva queda activa.

## Lo que NO se va a cambiar

- No se toca `SelectClinic.tsx` (la persistencia ya es correcta).
- No se toca `AuthRouteGuard.tsx` (la regla "super_admin sin clínica → /super-admin" se conserva como fallback).
- No se modifica RLS, hooks de datos, ni `Topbar`.
- No se borra ni renombra la clínica fantasma "Clínica Demo" (se decide en una tarea aparte cuando el usuario confirme).

## Riesgos y mitigación

- **Riesgo:** Si la clínica almacenada fue eliminada/desactivada, podríamos dejar al super_admin atrapado. → Mitigado con `clinicRow.is_active` y `clearSelectedRole()` antes del fallback al dashboard.
- **Riesgo:** Lectura adicional a `public.clinics`. → Una sola consulta por sesión, despreciable.

¿Apruebas este plan para proceder con la implementación?
