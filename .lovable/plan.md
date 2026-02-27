
# Plan: Auto-scroll en Historial Clinico segun la cita seleccionada

## Objetivo
Cuando se abre el Historial del Paciente desde el detalle de una cita, el dialog debe hacer scroll automatico a la fecha/hora de esa cita. Si la cita es futura (sin snapshot/evolucion aun), debe hacer scroll al final del historial.

## Cambios

### 1. `ClinicalHistoryDialog.tsx` - Agregar prop `scrollToDate`
- Nueva prop opcional `scrollToDate?: string` (formato YYYY-MM-DD).
- Despues de que `isLoading` pase a `false`, usar un `useEffect` con `setTimeout` para buscar el elemento con `data-date={scrollToDate}` dentro del `DialogContent` y llamar `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- Si no se encuentra el elemento (fecha futura sin entrada), hacer scroll al final del contenedor del dialog.
- Pasar la prop al componente sin cambios en `ClinicalHistoryBlock`.

### 2. `ClinicalHistoryBlock.tsx` - Agregar `data-date` a cada bloque de fecha
- En el `div` con `key={date}` (linea 338), agregar el atributo `data-date={date}` para que el dialog pueda encontrarlo via `querySelector`.

### 3. `AppointmentDetailDialog.tsx` - Pasar la fecha de la cita al dialog
- Al renderizar `ClinicalHistoryDialog` (linea 831), agregar `scrollToDate={appointment?.date}`.

### 4. Otros consumidores (`Patients.tsx`, `PatientHistoryButton.tsx`)
- No se modifican. Al no pasar `scrollToDate`, el comportamiento por defecto (sin scroll automatico) se mantiene.

## Resumen de archivos a modificar
- `src/components/patients/ClinicalHistoryBlock.tsx` (1 linea: agregar data-date)
- `src/components/patients/ClinicalHistoryDialog.tsx` (nueva prop + useEffect con scroll logic)
- `src/components/dialogs/AppointmentDetailDialog.tsx` (1 linea: pasar scrollToDate)
