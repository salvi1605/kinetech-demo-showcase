

# Crear cita desde lista de pacientes y detalle del paciente

## Resumen

Agregar un boton "Crear cita" con icono de calendario en **cada paciente individual**, tanto en la lista de pacientes como en el detalle del paciente. Al presionarlo, navega al calendario con el dialogo de nuevo turno abierto y el paciente pre-seleccionado.

## Donde aparece el boton

1. **Lista de pacientes (desktop)**: Nuevo icono en la fila de acciones de cada paciente (junto a historial, editar, eliminar) - linea ~270 de `Patients.tsx`
2. **Lista de pacientes (mobile cards)**: Nuevo icono en la barra de acciones de cada card - linea ~383 de `Patients.tsx`
3. **Detalle del paciente (header)**: Nuevo boton junto a "Editar Paciente" en la cabecera - linea ~272 de `PatientDetailTabs.tsx`

Todos envueltos en `RoleGuard` con roles `['admin_clinic', 'tenant_owner', 'receptionist']` (los que pueden crear citas).

## Flujo del usuario

```text
Paciente (lista o detalle)
  |
  v
Click en icono calendario
  |
  v
Navega a /calendar?patientId=abc123
  |
  v
Calendar.tsx lee el query param
  |
  v
Abre NewAppointmentDialog con paciente pre-llenado
  |
  v
Usuario elige fecha, hora, profesional y confirma
```

## Cambios tecnicos

### Archivo 1: `src/pages/Patients.tsx`

- Importar `CalendarPlus` de lucide-react
- Agregar boton con icono `CalendarPlus` en la tabla desktop (entre historial y editar, linea ~270)
  - `onClick`: `navigate('/calendar?patientId=' + patient.id)`
  - Tooltip: "Crear cita"
  - Envuelto en `RoleGuard allowedRoles={['admin_clinic', 'tenant_owner', 'receptionist']}`
- Agregar el mismo boton en las mobile cards (linea ~393, entre historial y editar)

### Archivo 2: `src/pages/PatientDetailTabs.tsx`

- Importar `CalendarPlus` de lucide-react
- Agregar boton "Crear cita" con icono `CalendarPlus` en el header, junto al boton "Editar Paciente" (linea ~272)
  - `onClick`: `navigate('/calendar?patientId=' + patient.id)`
  - Solo visible para roles admin/receptionist via RoleGuard
- Importar `RoleGuard` desde shared

### Archivo 3: `src/pages/Calendar.tsx`

- Importar `useSearchParams` de react-router-dom
- Al montar, leer `searchParams.get('patientId')`
- Si existe `patientId`:
  - Setear `showNewAppointmentModal = true`
  - Guardar el patientId en un nuevo estado `preselectedPatientId`
  - Limpiar el query param con `setSearchParams` (para evitar re-aperturas)
- Pasar `preselectedPatientId` como nueva prop a `NewAppointmentDialog`

### Archivo 4: `src/components/dialogs/NewAppointmentDialog.tsx`

- Agregar prop opcional `preselectedPatientId?: string`
- En un `useEffect`, cuando `open` es `true` y `preselectedPatientId` tiene valor:
  - Setear `form.setValue('patientId', preselectedPatientId)`
  - Buscar el paciente en `state.patients` y setear `patientSearch` con su nombre para que se muestre visualmente seleccionado
- El usuario puede cambiar el paciente si lo desea (no es fijo)

