
# Contacto de emergencia opcional - Ajuste de UI

## Estado actual

La validacion ya esta configurada como opcional (no hay reglas de validacion para los campos de emergencia). Sin embargo, las etiquetas en los formularios siguen mostrando un asterisco (`*`) que indica al usuario que son obligatorios, lo cual es incorrecto.

La base de datos ya acepta valores NULL para `emergency_contact_name`, `emergency_contact_phone` y `emergency_contact_relationship`.

## Cambios necesarios

### 1. `src/components/patients/NewPatientDialogV2.tsx`

- Linea 398: Cambiar `"Nombre de Contacto *"` a `"Nombre de Contacto"`
- Linea 420: Cambiar `"Teléfono de emergencia *"` a `"Teléfono de emergencia"`

### 2. `src/components/patients/EditPatientDialogV2.tsx`

- Linea 446: Cambiar `"Nombre de Contacto *"` a `"Nombre de Contacto"`
- Linea 468: Cambiar `"Teléfono de emergencia *"` a `"Teléfono de emergencia"`

Estos son los unicos cambios necesarios. La validacion y la base de datos ya tratan estos campos como opcionales.
