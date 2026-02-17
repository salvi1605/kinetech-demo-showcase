

# Plan: Rango de fechas en Nueva Excepcion

## Resumen

Modificar el dialogo "Nueva Excepcion" para que en lugar de seleccionar una sola fecha, el usuario pueda definir un rango con **Fecha inicio** y **Fecha fin**. Al guardar, se creara un registro individual en `schedule_exceptions` por cada dia del rango.

---

## Cambios en la UI del formulario

### Reemplazar campo "Fecha" por dos campos

El campo unico `date` se reemplaza por:

- **Fecha inicio** (obligatorio): date picker, igual al actual
- **Fecha fin** (opcional): date picker. Si no se completa, se asume un solo dia (igual que antes). Si se completa, debe ser >= fecha inicio.

Cuando fecha fin esta definida, se muestra un texto informativo debajo: "Se crearan X excepciones (una por dia)".

### Validacion

- `dateFrom` es obligatorio (reemplaza a `date`)
- `dateTo` es opcional; si se completa, debe ser >= `dateFrom`
- Limite maximo de 90 dias de rango para evitar creaciones masivas accidentales
- La advertencia de citas afectadas se adapta para contar citas en todo el rango de fechas

### Comportamiento al guardar

- Si solo hay `dateFrom` (sin `dateTo`): se crea 1 registro, comportamiento identico al actual
- Si hay `dateFrom` y `dateTo`: se generan todas las fechas del rango (inclusive) y se hace un insert batch de N registros, todos con los mismos datos (tipo, profesional, horario, motivo)

### Edicion

- Cuando se edita una excepcion existente, se mantiene el comportamiento de fecha unica (solo `dateFrom`), ya que cada registro es independiente. El campo `dateTo` aparece vacio y deshabilitado en modo edicion.

---

## Detalles tecnicos

### Schema zod actualizado

```text
exceptionSchema:
  type: enum
  dateFrom: z.date (obligatorio)
  dateTo: z.date (opcional, >= dateFrom, max 90 dias de diferencia)
  practitionerId: string (opcional)
  fromTime: string (opcional)
  toTime: string (opcional)
  reason: string (max 500, opcional)
```

### Logica de insert batch

```text
1. Calcular array de fechas: eachDayOfInterval({ start: dateFrom, end: dateTo || dateFrom })
2. Mapear cada fecha a un payload con los mismos campos
3. Insertar con supabase.from('schedule_exceptions').insert(payloads)
4. Mostrar toast con la cantidad de excepciones creadas
```

### Advertencia de citas afectadas

La consulta de citas afectadas se adapta para filtrar por rango:
- `.gte('date', dateFromISO).lte('date', dateToISO)`
- En lugar del `.eq('date', dateISO)` actual

---

## Archivo a modificar

- `src/components/dialogs/NewExceptionDialog.tsx`: todos los cambios se concentran en este archivo
