

## Fix: SubSlotPicker debe mostrar ocupación global del bloque

### Problema
El `SubSlotPicker` filtra por `practitioner_id` al consultar slots ocupados, pero el constraint único `uq_appointments_active_slot` es sobre `(clinic_id, date, start_time, sub_slot)` — los sub-slots se comparten entre TODOS los profesionales. Resultado: muestra 1 ocupado cuando hay 3.

### Cambio

**Archivo:** `src/components/shared/SubSlotPicker.tsx`

Eliminar `.eq('practitioner_id', practitionerId)` de la query de ocupación. La consulta queda:

```typescript
supabase
  .from('appointments')
  .select('sub_slot')
  .eq('clinic_id', clinicId)
  .eq('date', date)
  .eq('start_time', startTime)
  .neq('status', 'cancelled');
```

Esto coincide con la granularidad del constraint único y muestra correctamente todos los sub-slots ocupados por cualquier profesional.

El `practitionerId` sigue siendo necesario como prop (para validaciones de disponibilidad del profesional y para el render condicional del picker), pero no debe usarse para filtrar la ocupación de sub-slots.

### Resultado
- En el ejemplo de las 08:00: se muestran 3 slots ocupados (Fallotico, Ramirez, Belloso) y 2 libres
- Consistente con el constraint de DB que impide duplicados a nivel clínica/fecha/hora/subslot

