
# Plan: Hacer citas clickeables en detalle de paciente

## Objetivo
En la ficha del paciente, tanto en "Proximos Turnos" (tab Resumen) como en la tab "Historial", cada cita sera un boton clickeable que abre el `AppointmentDetailDialog` (el mismo que se usa desde el calendario).

## Problema tecnico
El `AppointmentDetailDialog` lee la cita desde `state.appointmentsById`, pero las citas del paciente se cargan localmente en `PatientDetailTabs` y no estan en el store global. Hay que inyectarlas antes de abrir el dialog.

## Cambios en un solo archivo

**`src/pages/PatientDetailTabs.tsx`**

1. **Importar** `AppointmentDetailDialog` y agregar estado para controlar el dialog:
   - `selectedAppointmentId: string | null`
   - `showAppointmentDetail: boolean`

2. **Funcion `handleOpenAppointment`**: recibe una `Appointment` local, la despacha al store global con `dispatch({ type: 'ADD_APPOINTMENT', payload: apt })` para que `appointmentsById` la contenga, luego setea el `selectedAppointmentId` y abre el dialog.

3. **Proximos Turnos** (lineas ~414-422): convertir cada `div` de cita en un elemento clickeable (cursor-pointer, hover) que llama a `handleOpenAppointment(apt)`.

4. **Historial** (lineas ~673-698): convertir cada `div` de cita en un elemento clickeable con el mismo comportamiento.

5. **Renderizar `AppointmentDetailDialog`** al final del componente, pasando `appointmentId={selectedAppointmentId}` y un callback `onAppointmentChange` que refresque las citas locales (`fetchPatientAppointments`).

## Detalles tecnicos

- Se usa `ADD_APPOINTMENT` del reducer existente para inyectar la cita en el store. Si la cita ya existe (por estar en la semana actual del calendario), el dispatch no duplica.
- El dialog se cierra normalmente y al cerrar se limpia `selectedAppointmentId`.
- No se necesitan cambios en la base de datos ni en otros archivos.
