

# Plan: Backfill de datos historicos de citas y notas clinicas

## Resumen

Actualizar los datos existentes en la base de datos para que todas las citas pasadas reflejen estado "completed" (Asistio) y tengan sus entradas de historial clinico correspondientes.

## Datos actuales

- **41 citas pasadas** (8 pacientes unicos)
- 22 con estado `no_show`, 19 con estado `completed`
- Solo **6 de 41** tienen evolution stub creado
- Solo **3 de 8** pacientes tienen al menos un snapshot clinico

## Operaciones a ejecutar (3 queries de datos)

### 1. Marcar todas las citas pasadas como "completed"

Actualizar las 22 citas en estado `no_show` a `completed` para que figuren como que el paciente asistio.

### 2. Crear evolution stubs faltantes

Insertar una nota clinica de tipo `evolution` con body vacio para cada una de las ~35 citas pasadas que no tienen una. Usa los datos de la cita (clinic_id, practitioner_id, patient_id, date, start_time, appointment_id).

### 3. Crear un snapshot clinico para pacientes sin uno

Para los 5 pacientes que no tienen ningun snapshot, insertar una nota de tipo `snapshot` con body vacio y clinical_data vacio (`{}`) en la fecha de su primera cita. Esto permite que el admin pueda editarlo despues.

## Archivos modificados

Ninguno. Son unicamente operaciones de datos (UPDATE e INSERT) sobre tablas existentes:
- `appointments` (UPDATE status)
- `patient_clinical_notes` (INSERT evolutions y snapshots)

## Criterios de aceptacion

1. Todas las citas con `date < CURRENT_DATE` tienen status `completed`.
2. Cada cita pasada tiene exactamente una nota de tipo `evolution` asociada por `appointment_id`.
3. Cada paciente con citas pasadas tiene al menos un snapshot clinico en la fecha de su primera cita.
4. No se modifica ningun archivo de codigo.

