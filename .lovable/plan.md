

# Horario Especial — Renombrar + obligar profesional + permisos

## Situación actual

### Quién puede acceder a la página de Excepciones
La ruta `/exceptions` está visible en el sidebar y bottom nav para estos roles:
- `admin_clinic`
- `tenant_owner`
- `super_admin`
- `health_pro`

**No tiene acceso:** `receptionist`

### Quién puede crear/editar/eliminar excepciones (RLS en `schedule_exceptions`)
- **ALL** (CRUD completo): roles admin (`is_admin_clinic`) — incluye `admin_clinic`, `tenant_owner`, `super_admin`
- **ALL** (CRUD completo): `health_pro` — pero solo sobre excepciones donde `practitioner_id = current_practitioner_id()` o donde `practitioner_id IS NULL` y el usuario es `health_pro` de esa clínica
- **SELECT** (solo lectura): `receptionist`

En resumen: un `health_pro` puede crear excepciones de tipo `extended_hours` para sí mismo, pero los admins pueden crearlas para cualquier profesional.

## Cambios necesarios

### 1. Renombrar "Horario extendido" → "Horario especial"
Cambio cosmético en 4 archivos:
- `NewExceptionDialog.tsx` — label del select
- `Exceptions.tsx` — `TYPE_LABELS` y filtro
- `Calendar.tsx` — `TYPE_LABELS`
- Los i18n strings si aplica (actualmente hardcoded en español)

### 2. Hacer `practitionerId` obligatorio para `extended_hours`
Actualmente el formulario lo marca como "(opcional)" para `extended_hours`. Se debe cambiar a obligatorio, igual que `practitioner_block`.

Cambios en `NewExceptionDialog.tsx`:
- En `exceptionSchema.superRefine`: agregar validación de que `practitionerId` es requerido cuando `type === 'extended_hours'`
- En el label del campo profesional: mostrar "(obligatorio)" para ambos tipos
- En `basePayload`: asegurar que el `practitioner_id` se envíe siempre para `extended_hours`

### 3. No hay cambios de permisos necesarios
La estructura actual ya es correcta: admins gestionan todas las excepciones, health_pro gestiona las propias.

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/dialogs/NewExceptionDialog.tsx` | Renombrar label + practitioner obligatorio |
| `src/pages/Exceptions.tsx` | Renombrar en `TYPE_LABELS` y filtro |
| `src/pages/Calendar.tsx` | Renombrar en `TYPE_LABELS` |

Sin cambios en base de datos, RPCs ni lógica de backend.

