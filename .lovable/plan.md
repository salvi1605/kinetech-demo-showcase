
# Plan: Soft-Delete de paciente LEVY LUISA + Boton "Desactivar" solo para Admins

## 1. Eliminar (soft-delete) al paciente LEVY LUISA (DNI 6691470)

Ejecutar un UPDATE en la base de datos para marcar `is_deleted = true` y `deleted_at = now()` en el paciente con id `8a645a44-a66b-4a9d-b310-bb96c767c55a`. Este paciente no tiene citas asociadas.

## 2. Corregir la funcion `handleDelete` en `src/pages/Patients.tsx`

Actualmente el boton "Eliminar" solo ejecuta `dispatch({ type: 'DELETE_PATIENT' })` que solo modifica estado en memoria. Se reemplazara con una llamada real a la base de datos:

- Llamar a `supabase.from('patients').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', patientId)`
- Luego llamar a `refetchPatients()` para refrescar la lista
- Mostrar toast de exito o error segun el resultado

## 3. Restringir el boton "Eliminar" solo a admins

Cambiar el `RoleGuard` del boton de eliminar (tanto en desktop como en mobile) de:
```
allowedRoles={['admin_clinic', 'tenant_owner', 'receptionist']}
```
a:
```
allowedRoles={['admin_clinic', 'tenant_owner']}
```

Esto asegura que solo administradores pueden desactivar pacientes. Recepcionistas y profesionales no veran el boton.

## 4. Mejorar el dialogo de confirmacion

Actualizar el texto del `AlertDialog` para reflejar que es una desactivacion, no una eliminacion permanente:

- Titulo: "Desactivar paciente {nombre}?"
- Descripcion: "El paciente sera marcado como inactivo y dejara de aparecer en las listas. Su informacion y historial clinico se conservan intactos. Solo un administrador puede realizar esta accion."
- Boton: "Desactivar" en lugar de "Eliminar"

## 5. Agregar RLS policy para permitir UPDATE de is_deleted solo a admins

Actualmente la politica `patients_recep_update` permite a recepcionistas hacer UPDATE en pacientes. Esto significa que tecnicamente podrian soft-deletear via la API. Se agregara una politica o se dejara como esta dado que el boton ya esta oculto en UI. La restriccion real ya existe: solo admin_clinic y tenant_owner veran el boton. La politica RLS de recepcionista permite editar datos del paciente (que es correcto para su funcion).

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Patients.tsx` | Corregir `handleDelete` para persistir en BD; cambiar RoleGuard del boton eliminar a solo admins; actualizar textos del AlertDialog |

### Accion de datos

- UPDATE directo al paciente LEVY LUISA para marcarlo como eliminado
