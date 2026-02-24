

# Plan: Boton "Nuevo Paciente" en el dialogo de cita masiva

## Objetivo

Agregar un boton junto al label "Paciente *" en `MassCreateAppointmentDialog` que abra el formulario de nuevo paciente (`NewPatientDialogV2`). Al terminar de crear el paciente, este queda automaticamente seleccionado en el campo de paciente del dialogo de cita masiva.

## Cambios

### 1. `src/components/patients/NewPatientDialogV2.tsx`

Modificar la prop `onSuccess` para que pase el ID y nombre del paciente recien creado:

- Cambiar la interfaz: `onSuccess?: (patientId: string, patientName: string) => void`
- En `handleSubmit`, despues de la insercion exitosa, llamar `onSuccess(data.id, fullName)` pasando los datos del nuevo paciente

### 2. `src/components/dialogs/MassCreateAppointmentDialog.tsx`

- Agregar estado `showNewPatientDialog` (boolean, default false)
- Junto al label "Paciente *" (linea 546), agregar un boton "+ Nuevo" que abra el dialogo de nuevo paciente
- Renderizar `NewPatientDialogV2` con:
  - `open={showNewPatientDialog}`
  - `onOpenChange={setShowNewPatientDialog}`
  - `onSuccess={(id, name) => { setPatientId(id); setPatientSearch(name); setShowNewPatientDialog(false); }}` -- esto auto-selecciona el paciente recien creado
- Tambien disparar refresh de pacientes (`window.dispatchEvent(new Event('patientsUpdated'))` o similar) para que el estado global tenga al nuevo paciente

## Detalle tecnico

```text
MassCreateAppointmentDialog
  |
  +-- Label "Paciente *"  [+ Nuevo]  <-- boton nuevo
  |     |
  |     +-- Input busqueda
  |     +-- Lista resultados
  |
  +-- NewPatientDialogV2 (condicional)
        |
        +-- onSuccess(patientId, fullName)
              |
              +-- setPatientId(patientId)
              +-- setPatientSearch(fullName)
              +-- refresh patients list
```

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/patients/NewPatientDialogV2.tsx` | Modificar firma de `onSuccess` para pasar `(patientId, patientName)` |
| `src/components/dialogs/MassCreateAppointmentDialog.tsx` | Agregar boton "+ Nuevo", estado para el dialogo, renderizar `NewPatientDialogV2`, auto-seleccionar paciente creado |

