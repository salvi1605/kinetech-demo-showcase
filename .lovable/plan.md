

# Fix: Permitir vincular cualquier usuario de la clinica a un profesional

## Problema

El hook `useAvailableUsersForPractitioner` filtra usuarios exclusivamente por el rol `health_pro`. Esto impide vincular a Telma (que es `tenant_owner`) como profesional, a pesar de que ella tambien ejerce como kinesióloga en la clinica.

Lo mismo ocurre en `LinkPractitionerModal`, que usa `useUnlinkedPractitioners` pero el flujo inverso (vincular usuario a profesional desde UserManagement) probablemente tiene la misma restriccion.

## Solucion

Modificar el hook `useAvailableUsersForPractitioner` para que cargue **todos los usuarios activos de la clinica** (sin importar su rol), en lugar de filtrar solo por `health_pro`.

### Archivo: `src/hooks/useAvailableUsersForPractitioner.ts`

**Cambio en la consulta (linea 35-47):**

Reemplazar:
```typescript
const { data: healthProUsers, error: usersError } = await supabase
  .from('user_roles')
  .select(`user_id, users!inner (id, full_name, email)`)
  .eq('clinic_id', clinicId)
  .eq('role_id', 'health_pro')   // <-- ESTE FILTRO ES EL PROBLEMA
  .eq('active', true);
```

Por:
```typescript
const { data: clinicUsers, error: usersError } = await supabase
  .from('user_roles')
  .select(`user_id, role_id, users!inner (id, full_name, email)`)
  .eq('clinic_id', clinicId)
  .eq('active', true);
```

Esto elimina el filtro por `health_pro` y permite que cualquier usuario de la clinica (tenant_owner, admin_clinic, receptionist, health_pro) pueda ser vinculado a un profesional.

Tambien se deduplicaran los resultados por `user_id` (ya que un usuario puede tener multiples roles en la misma clinica).

**Actualizar el texto descriptivo** en `NewProfessionalDialog.tsx` y `EditProfessionalDialog.tsx`:

Cambiar:
```
Vincula este profesional a un usuario con rol "Profesional" para que pueda iniciar sesión.
```

Por:
```
Vincula este profesional a un usuario de la clinica para que pueda iniciar sesión y ver su agenda.
```

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useAvailableUsersForPractitioner.ts` | Eliminar filtro `.eq('role_id', 'health_pro')`, deduplicar por user_id |
| `src/components/dialogs/NewProfessionalDialog.tsx` | Actualizar texto descriptivo del campo |
| `src/components/dialogs/EditProfessionalDialog.tsx` | Actualizar texto descriptivo del campo |

## Resultado esperado

Al crear o editar un profesional, el selector "Usuario asociado" mostrara a todos los usuarios de la clinica (incluida Telma como tenant_owner), no solo a los que tienen rol `health_pro`.
