

## Plan: Edición inline de tratamiento para `health_pro`

### Cambio único en `src/components/dialogs/AppointmentDetailDialog.tsx`

En la sección "Tipo de Tratamiento" (líneas 469-480), agregar edición inline:

1. **Nuevo estado local**: `isEditingTreatment` (boolean) y `tempTreatment` (string)
2. **Botón lápiz** al lado del label "Tratamiento" — visible solo cuando `canChangeTreatment` es `true`
3. **Al hacer click**: reemplaza el texto estático por `DynamicTreatmentSelect` + botones Guardar/Cancelar
4. **Al guardar**: llama `updateAppointmentRpc` con `treatmentTypeKey`, actualiza estado local via dispatch, muestra toast de éxito
5. **Al cancelar**: vuelve a vista read-only sin cambios

### Restricciones de permisos

```text
isToday = appointment.date === format(new Date(), 'yyyy-MM-dd')
isOwnAppointment = appointment.practitionerId === currentPractitionerId

canChangeTreatment =
  role in ['admin_clinic', 'tenant_owner', 'super_admin']
  OR (role === 'health_pro' AND isToday AND isOwnAppointment)
```

- **`health_pro`**: Solo puede cambiar tratamiento en citas del **día actual** que sean **suyas** (su `practitionerId`)
- **`admin_clinic` / `tenant_owner`**: Pueden cambiar sin restricción de fecha ni asignación
- **`receptionist`**: No puede cambiar tratamiento (no aparece el botón)

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/dialogs/AppointmentDetailDialog.tsx` | Agregar edición inline de tratamiento en la sección read-only (líneas 469-480), con lógica de permisos restrictiva |

### Sin migraciones de BD

El RPC `validate_and_update_appointment` ya soporta `p_treatment_type_key`, y la RLS policy `appointments_pro_update_own` ya permite UPDATE para `health_pro` en sus propias citas.

