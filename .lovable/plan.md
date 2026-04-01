
Objetivo: eliminar el “cargando infinito” en historias pendientes para perfiles administrativos (admin_clinic, tenant_owner, super_admin) y mostrar correctamente los pacientes con historia faltante.

## Hallazgo (causa raíz)
El problema principal no está en permisos de backend, sino en UI/roles:

1) `Calendar.tsx` renderiza `PendingNotesHealthProBanner` dentro de `RoleGuard allowedRoles={['health_pro']}`.  
2) `RoleGuard` da acceso total a `super_admin`, por lo que super_admin también entra a ese banner.  
3) `currentPractitionerId` solo se resuelve cuando `state.userRole === 'health_pro'`; para super_admin queda `undefined`.  
4) `PendingNotesHealthProBanner.tsx` interpreta `!practitionerId` como estado de carga y muestra spinner permanente (`if (!practitionerId || isLoading) ...`), quedando “cargando para siempre”.

Adicionalmente, en admin hoy se muestra progreso por profesional, pero no una lista clara de pacientes pendientes.

## Plan de implementación

### 1) Corregir gating por rol en Calendar (evitar banner de kinesio en admins)
- Archivo: `src/pages/Calendar.tsx`
- Cambiar el render del banner de kinesio para que sea **estricto para `health_pro`** (sin herencia implícita de super_admin en este bloque).
- Mantener el banner admin para `admin_clinic`, `tenant_owner` y `super_admin`.

Resultado: perfiles administrativos solo ven el bloque administrativo (no el spinner de kinesio).

### 2) Corregir estado visual en `PendingNotesHealthProBanner`
- Archivo: `src/components/calendar/PendingNotesHealthProBanner.tsx`
- Separar condiciones:
  - `if (!practitionerId) return null` (o estado neutro no-loading).
  - `if (isLoading) mostrar skeleton/spinner`.
- Evitar que la ausencia de practitioner id se trate como “loading”.

Resultado: desaparece el “cargando infinito” por falta de practitioner id.

### 3) Endurecer `usePendingClinicalNotes` para estados limpios
- Archivo: `src/hooks/usePendingClinicalNotes.ts`
- En guard clause inicial (`!clinicId || !date`), resetear data y asegurar `isLoading = false` explícitamente.
- Mantener `finally` como cierre único de loading en fetch real.

Resultado: el hook no queda en estados ambiguos al cambiar clínica/rol/ruta.

### 4) Mejorar visibilidad para admins: lista de pacientes pendientes
- Archivo: `src/components/calendar/PendingNotesAdminBanner.tsx` (y tipado en hook si hace falta)
- Reutilizar `pendingItems` (ya existe en hook) para agregar en el Sheet una sección “Pacientes pendientes” con:
  - Hora
  - Paciente
  - Profesional
  - Tratamiento
- Si hace falta, extender `PendingNoteItem` con `practitionerName`.

Resultado: admin/owner/superadmin puede ver explícitamente qué pacientes faltan completar.

### 5) Validación funcional por rol (QA)
- `health_pro`: ve su banner, carga termina, lista sus pendientes.
- `admin_clinic` / `tenant_owner`: no ven spinner de kinesio; ven panel admin con progreso y pacientes pendientes.
- `super_admin`: mismo comportamiento administrativo (sin carga infinita).
- Verificar actualización al cambiar día/profesional/semana y al completar una historia.

## Detalles técnicos (resumen)
- No requiere migraciones ni cambios de RLS.
- El fix central es de composición de UI + condiciones de carga.
- Ajustes puntuales:
  - `Calendar.tsx`: render condicional por rol estricto para banner health_pro.
  - `PendingNotesHealthProBanner.tsx`: `!practitionerId` deja de significar “loading”.
  - `usePendingClinicalNotes.ts`: guard clause con reset defensivo.
  - `PendingNotesAdminBanner.tsx`: tabla/lista de pacientes pendientes para trazabilidad operativa.

## Archivos a tocar
- `src/pages/Calendar.tsx`
- `src/components/calendar/PendingNotesHealthProBanner.tsx`
- `src/hooks/usePendingClinicalNotes.ts`
- `src/components/calendar/PendingNotesAdminBanner.tsx`
