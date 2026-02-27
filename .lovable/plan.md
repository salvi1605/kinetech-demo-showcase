
# Reprogramar con vista previa de disponibilidad

## Problema actual
Al hacer clic en "Reprogramar" en el detalle de una cita, se muestra un formulario con un input de fecha y un dropdown de hora, pero sin ninguna referencia visual de que horarios estan ocupados o libres. El usuario debe memorizar o ir al calendario aparte para verificar disponibilidad.

## Solucion propuesta
Agregar una **mini-grilla de disponibilidad** dentro del formulario de edicion que se actualice automaticamente cuando el usuario cambia la fecha o el profesional. Esta grilla muestra los bloques horarios del dia seleccionado con indicacion visual de cuales estan libres y cuales ocupados.

### Como se vera

```text
+--------------------------------------------------+
| Reprogramar Turno                                 |
+--------------------------------------------------+
| Estado: [Reservado v]                             |
| Fecha:  [2026-03-04]   Profesional: [Dra. Lopez] |
|                                                   |
| Disponibilidad del dia:                           |
| +----------------------------------------------+ |
| | 08:00  [  libre  ] [  libre  ] [ocupado]      | |
| | 08:30  [  libre  ] [ocupado  ] [  libre  ]    | |
| | 09:00  [>>ACTUAL<<] [  libre  ] [  libre  ]   | |
| | 09:30  [  libre  ] [  libre  ] [  libre  ]    | |
| | ...                                           | |
| +----------------------------------------------+ |
| (click en un slot libre = selecciona esa hora)    |
|                                                   |
| Hora seleccionada: 09:00                          |
| Tratamiento: [FKT v]                              |
| Notas: [____________]                             |
| [Cancelar]  [Guardar cambios]                     |
+--------------------------------------------------+
```

### Comportamiento
- Al cambiar la **fecha** o el **profesional**, se hace un query ligero a `appointments` para obtener las citas de ese dia y profesional en la clinica actual
- Cada bloque horario (segun `clinic_settings.workday_start/end` y `min_slot_minutes`) muestra sus sub-slots con estado: libre (verde claro, clickeable), ocupado (gris, no clickeable), o actual (borde azul, indicando la cita que se esta editando)
- Al hacer **click en un slot libre**, se actualiza automaticamente el campo `startTime` del formulario
- La cita actual se resalta para que el usuario sepa cual esta moviendo
- Si no hay disponibilidad configurada para ese dia, se muestra un aviso amarillo
- Si el dia esta bloqueado (schedule_exceptions), se muestra un aviso rojo

## Cambios tecnicos

### 1. Nuevo componente: `src/components/shared/RescheduleSlotPicker.tsx`
Componente reutilizable que recibe:
- `clinicId`, `practitionerId`, `date` (YYYY-MM-DD)
- `currentAppointmentId` (para resaltarlo como "actual")
- `onSelectSlot(time: string)` callback
- `selectedTime` (hora actualmente seleccionada en el form)

Internamente:
- Query a `appointments` filtrado por clinicId + practitionerId + date + status != cancelled
- Query a `schedule_exceptions` para detectar bloqueos del dia
- Usa `useClinicSettings` para obtener los horarios de jornada y sub-slots
- Renderiza una grilla vertical compacta de bloques con sub-slots coloreados
- Muestra skeleton mientras carga

### 2. Modificar `src/components/dialogs/AppointmentDetailDialog.tsx`
- Importar y renderizar `RescheduleSlotPicker` dentro del formulario de edicion, entre el campo de fecha/profesional y el de hora
- El componente se alimenta de los valores `watch('date')` y `watch('practitionerId')` del formulario
- Al hacer click en un slot del picker, se llama `form.setValue('startTime', selectedTime)`
- El select de hora existente se mantiene como alternativa (por si prefieren escribir directamente), pero se sincroniza con el picker

### 3. Sin cambios de base de datos
No se requieren migraciones ni cambios de esquema. Se reutilizan las tablas existentes (`appointments`, `schedule_exceptions`, `clinic_settings`).
