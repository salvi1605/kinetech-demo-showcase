

# Plan: Pasar paciente pre-seleccionado al dialog de cita masiva

## Problema
Cuando el usuario viene desde la ficha de un paciente (`/calendar?patientId=X`), el paciente se pre-carga en el dialog de cita **individual** pero **no** en el de cita **masiva**. El usuario tiene que buscarlo manualmente.

## Cambios

### 1. MassCreateAppointmentDialog (src/components/dialogs/MassCreateAppointmentDialog.tsx)

- Agregar prop `preselectedPatientId?: string` a la interfaz `MassCreateAppointmentDialogProps`
- Agregar un `useEffect` (igual al que ya existe en `NewAppointmentDialog`) que cuando el dialog se abra con `preselectedPatientId`, setee `patientId` y `patientSearch` automaticamente con los datos del paciente

### 2. Calendar (src/pages/Calendar.tsx)

- Pasar `preselectedPatientId={preselectedPatientId ?? undefined}` al componente `MassCreateAppointmentDialog` (linea ~1242)
- En el `onOpenChange` del `MassCreateAppointmentDialog`, limpiar `preselectedPatientId` cuando se cierre (mismo patron que ya se usa en `NewAppointmentDialog` en linea ~1229)

## Resultado

Ambos dialogs (individual y masivo) recibiran el paciente pre-seleccionado cuando el usuario venga desde la ficha del paciente. Sin esa prop, ambos funcionan igual que antes.

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/dialogs/MassCreateAppointmentDialog.tsx` | Nueva prop + useEffect |
| `src/pages/Calendar.tsx` | Pasar prop + limpiar al cerrar |

