

# Plan: Vista de Pacientes Inactivos + Reactivar

## Resumen

Agregar un toggle/tab visible solo para administradores en la pagina de Pacientes que permita ver los pacientes desactivados (is_deleted = true) y reactivarlos con un boton.

## Cambios

### 1. Nuevo hook `useInactivePatients`

Crear `src/hooks/useInactivePatients.ts` que consulte pacientes con `is_deleted = true` para la clinica actual. Mismo mapeo que `usePatients` pero filtrando por `is_deleted = true`.

### 2. Modificar `src/pages/Patients.tsx`

- Agregar un boton/toggle "Ver inactivos" visible solo para `admin_clinic` y `tenant_owner` (usando RoleGuard) en la zona de filtros/header.
- Cuando esta activo, mostrar la lista de pacientes inactivos en lugar de los activos, con un badge "Inactivo" en cada fila.
- En cada paciente inactivo, mostrar un boton "Reactivar" (icono undo/refresh) que:
  - Llame a `supabase.from('patients').update({ is_deleted: false, deleted_at: null }).eq('id', patientId)`
  - Verifique si ya existe un paciente activo con el mismo `document_id` en la clinica (para evitar conflicto con el constraint unique parcial). Si existe, mostrar un toast de error explicando el conflicto.
  - Refresque ambas listas (activos e inactivos)
  - Muestre toast de exito
- En modo inactivos: ocultar botones de editar, historial clinico, etc. Solo mostrar nombre, DNI, fecha de desactivacion y boton Reactivar.

### 3. Validacion de conflicto de DNI

Antes de reactivar, consultar si existe otro paciente activo con el mismo `document_id` y `clinic_id`:
```
SELECT id FROM patients WHERE clinic_id = X AND document_id = Y AND is_deleted = false AND id != Z
```
Si existe, mostrar error: "No se puede reactivar: ya existe un paciente activo con el mismo documento."

### Detalles tecnicos

| Archivo | Cambio |
|---|---|
| `src/hooks/useInactivePatients.ts` | Nuevo hook para consultar pacientes con is_deleted = true |
| `src/pages/Patients.tsx` | Toggle "Ver inactivos" (solo admins), lista de inactivos con boton Reactivar, validacion de DNI duplicado |

No se requieren cambios de base de datos ni migraciones. La RLS existente (`patients_admin_full_access` con `is_admin_clinic`) ya permite que admins hagan UPDATE en pacientes inactivos.

