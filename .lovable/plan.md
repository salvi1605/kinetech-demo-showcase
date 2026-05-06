# Bug: Telma cae como "dueño" al iniciar como Kinesióloga

## Diagnóstico (qué está pasando, en simple)

Telma tiene **dos roles activos en la misma clínica** (CTAK):

1. `tenant_owner` (Dueña)
2. `health_pro` (Kinesióloga)

Cuando entra y elige "Kinesióloga" en la pantalla de selección de clínica, el sistema la pone correctamente como `health_pro` y la lleva a /calendar.

**El problema:** mientras está usando la app, Supabase refresca automáticamente el token de sesión (cada ~50 minutos, o al cambiar de pestaña, o al volver del background del celular). Cada vez que ocurre ese refresco, nuestro `AppContext` vuelve a ejecutar el "bootstrap" del usuario desde cero, y el bootstrap **no recuerda qué rol eligió Telma**: simplemente vuelve a leer la base, ve que tiene 2 roles distintos en la única clínica, y por la lógica actual cae en una rama que la loguea con un rol distinto al que ella eligió. Resultado: de un momento a otro la app la trata como "la dueña" (o como admin), pierde acceso a la vista de Kinesióloga, y siente que "el sistema la botó".

Lo mismo pasa si:
- Refresca la página manualmente
- Cierra y abre la pestaña con la sesión todavía válida
- Su celular suspende la app y vuelve

No es un problema de permisos en BD ni de RLS — es solo el frontend pisando la elección del usuario al re-bootstrappear.

## Por qué solo le pasa a Telma (y a quienes tengan multi-rol)

La gran mayoría de usuarios tiene 1 solo rol por clínica → el bootstrap auto-selecciona ese único rol y todo está bien. Telma tiene 2 → cae en una rama que ignora su elección previa.

## Solución propuesta (mínima, sin tocar BD ni RLS)

**Recordar la elección del usuario** (clínica + rol) durante la sesión, y reutilizarla en cada bootstrap mientras la sesión siga viva.

### Cambios concretos

1. **`src/pages/SelectClinic.tsx`** — al hacer click en una clínica/rol, además de despachar al estado, persistir en `sessionStorage` un objeto pequeño:
   ```
   { clinicId, roleId }  → key: "agendix.selectedRoleByClinic"
   ```
   `sessionStorage` se borra solo al cerrar sesión / cerrar el navegador, así que no rompe nada.

2. **`src/contexts/AppContext.tsx`** — en `bootstrapUser`, antes de decidir la rama:
   - Leer `sessionStorage` para ver si hay una elección previa de `(clinicId, roleId)`.
   - Si existe **y** ese rol sigue activo en BD para ese usuario en esa clínica → usar `getUserRoleFromDB(userId, clinicId, roleId)` directamente y omitir la lógica de "auto-seleccionar / mandar a SelectClinic".
   - Si no existe o ya no es válido → seguir la lógica actual (mandar a SelectClinic cuando hay multi-rol, etc.).

3. **`LOGOUT` reducer** — limpiar también `sessionStorage.removeItem("agendix.selectedRoleByClinic")` para que al cerrar sesión no quede pegada la elección anterior.

4. **Botón "Cambiar de clínica/rol"** (si existe en el Topbar) — limpiar la misma key antes de redirigir a /select-clinic, para que el usuario pueda elegir otro rol sin que el sistema lo "fuerce" al anterior.

### Por qué esta solución es segura

- **No toca RLS, ni RPCs, ni BD.** Es 100% frontend.
- **No usa `localStorage`** — solo `sessionStorage`, que muere al cerrar el navegador y no comparte estado entre pestañas, evitando confusiones.
- **Se valida contra BD** en cada bootstrap (no confiamos ciegamente en sessionStorage): si el rol fue revocado, se descarta.
- **No afecta a usuarios mono-rol** — para ellos el flujo actual ya funciona, y esta lógica solo se dispara si hay una elección guardada.
- **Cero modal nuevo, cero UI nueva.** Es invisible para el usuario.

## Detalles técnicos

```text
Flujo actual (roto para multi-rol):
  Login → bootstrap → multi-rol → /select-clinic → user elige health_pro
                                                    → SET_CURRENT_CLINIC + SET_USER_ROLE
                                                    → /calendar  ✓
  ... 50 min después ...
  TOKEN_REFRESHED → onAuthStateChange → bootstrap (otra vez)
                                       → multi-rol → LOGIN con role='admin_clinic' por defecto  ✗
                                       → userRole pisado, vista de kinesio se pierde

Flujo propuesto:
  Login → bootstrap → multi-rol → /select-clinic → user elige health_pro
                                                    → guardar { clinicId, roleId } en sessionStorage
                                                    → SET_CURRENT_CLINIC + SET_USER_ROLE
                                                    → /calendar  ✓
  TOKEN_REFRESHED → bootstrap → lee sessionStorage → valida rol activo en BD
                                                    → getUserRoleFromDB(uid, clinicId, roleId)
                                                    → LOGIN + SET_CURRENT_CLINIC con el rol correcto  ✓
```

Archivos a tocar: `src/pages/SelectClinic.tsx`, `src/contexts/AppContext.tsx`. Nada más.

## Qué NO hacemos

- No tocamos `auth.users`, `user_roles`, ni la tabla `roles`.
- No cambiamos RLS ni RPCs.
- No quitamos roles a Telma — sigue siendo dueña Y kinesióloga, simplemente respetamos cuál eligió.
- No agregamos modales ni cambios visuales.

## Validación

Una vez aplicado, pedirle a Telma que:
1. Inicie sesión y elija "Kinesióloga".
2. Use la app normal por al menos 1 hora (o cierre y abra la pestaña varias veces).
3. Confirme que la vista sigue siendo la de Kinesióloga y no salta a la de Dueña.

Y también probar el caso inverso: que pueda cerrar sesión, volver a entrar, y elegir "Dueña" sin que el sistema la fuerce a Kinesióloga.
