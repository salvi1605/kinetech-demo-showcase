

# Fix: Copiar Horarios y Liberar Cita muestran solo turnos de la semana visible

## Problema

Tanto "Copiar Horarios" (en `AppointmentDetailDialog`) como "Liberar Cita" (`FreeAppointmentDialog`) filtran turnos desde `state.appointments`, que solo contiene los turnos cargados para la semana que se esta viendo en el calendario. Por eso, si la paciente "Torti Elizabeth Rita" tiene 16 turnos futuros pero solo 3 caen en la semana actual, solo se muestran esos 3.

## Solucion

Reemplazar el filtrado de `state.appointments` por una consulta directa a la base de datos que traiga **todos** los turnos futuros del paciente, sin limite de semana.

### Archivo 1: `src/components/dialogs/AppointmentDetailDialog.tsx`

**Cambio en `handleCopyAllPatientAppointments`** (~linea 418):

- En lugar de filtrar `state.appointments`, hacer una consulta directa a la BD:

```typescript
const { data } = await supabase
  .from('appointments')
  .select('id, date, start_time, practitioner_id, treatment_types(name)')
  .eq('clinic_id', state.currentClinicId)
  .eq('patient_id', appointment.patientId)
  .eq('status', 'scheduled')
  .gte('date', format(new Date(), 'yyyy-MM-dd'))
  .order('date')
  .order('start_time');
```

- Mapear los resultados y formatear para copiar al portapapeles

### Archivo 2: `src/components/dialogs/FreeAppointmentDialog.tsx`

**Cambio en `getFutureAppointments`** (~linea 32):

- Convertir a funcion asincrona con `useEffect` + estado local
- Consultar directamente la BD para obtener todos los turnos futuros del paciente:

```typescript
const { data } = await supabase
  .from('appointments')
  .select('id, date, start_time, sub_slot, status, notes, patient_id, practitioner_id')
  .eq('clinic_id', state.currentClinicId)
  .eq('patient_id', appointment.patientId)
  .eq('status', 'scheduled')
  .gte('date', format(new Date(), 'yyyy-MM-dd'))
  .order('date')
  .order('start_time');
```

- Agregar estado `futureAppointments` con `useState` y un `useEffect` que haga el fetch al abrir el dialogo
- Mantener la misma logica de seleccion/deseleccion y eliminacion

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/dialogs/AppointmentDetailDialog.tsx` | `handleCopyAllPatientAppointments`: consulta BD en vez de `state.appointments` |
| `src/components/dialogs/FreeAppointmentDialog.tsx` | `getFutureAppointments`: consulta BD en vez de `state.appointments`, agregar estado y efecto para fetch |

## Resultado esperado

Al abrir "Copiar Horarios" o "Liberar Cita" para cualquier paciente, se mostraran **todos** sus turnos futuros (los 16 en el caso de Torti), no solo los de la semana visible.
