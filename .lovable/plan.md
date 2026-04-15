

## Plan: Actualización inmediata del tratamiento en el diálogo

### Problema
Cuando se guarda el tratamiento editado, el diálogo no refleja el cambio porque:
1. No se despacha `UPDATE_APPOINTMENT` al AppContext tras guardar
2. El realtime sí refetcha, pero hay un delay perceptible

### Solución
En `handleSaveTreatment` (línea ~514), después del `toast`, agregar un `dispatch` para actualizar el appointment en el store local inmediatamente:

```typescript
// Después de result.success:
dispatch({
  type: 'UPDATE_APPOINTMENT',
  payload: {
    id: appointment.id,
    updates: { treatmentType: mapTreatmentNameToInternal(tempTreatment) }
  }
});
```

Donde `mapTreatmentNameToInternal` reutiliza la lógica existente de `mapTreatmentTypeToInternal` para convertir el nombre del tratamiento seleccionado al `TreatmentType` interno.

### Archivo a modificar

| Archivo | Cambio |
|---|---|
| `src/components/dialogs/AppointmentDetailDialog.tsx` | Agregar `dispatch({ type: 'UPDATE_APPOINTMENT', ... })` en `handleSaveTreatment` tras éxito, usando el nombre del tratamiento para derivar el tipo interno |

### Sin migraciones de BD
La actualización ya llega correctamente a la BD (confirmado por logs de realtime). Solo falta la actualización optimista del estado local.

