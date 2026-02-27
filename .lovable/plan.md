# Capacidad concurrente configurable por tratamiento

## Problema actual

La exclusividad de tratamientos esta hardcodeada en `TREATMENTS_EXCLUSIVOS` (solo "drenaje" y "masaje"). Si se agrega un nuevo tratamiento exclusivo, hay que tocar codigo. El usuario quiere que esto sea configurable desde la UI al crear/editar cada tratamiento.

## Solucion

Agregar un campo `max_concurrent` a la tabla `treatment_types` que define cuantos pacientes puede atender un profesional simultaneamente en un bloque de 30 minutos cuando tiene ese tratamiento asignado.

- `max_concurrent = 1` --> Tratamiento exclusivo (ej: Drenaje, Masaje). El profesional no puede tener otra cita en ese bloque.
- `max_concurrent = 5` (default) --> Comportamiento normal, limitado por `sub_slots_per_block` de la clinica.

## Cambios

### 1. Migracion de base de datos

- Agregar columna `max_concurrent INTEGER NOT NULL DEFAULT 2` a `treatment_types`
- Valores validos: 1 a (el numero de sub-slots disponibles en la clínica)

### 2. Actualizar RPCs de citas

Modificar `validate_and_create_appointment` y `validate_and_update_appointment`:

- En lugar de comparar contra la lista hardcodeada `IN ('drenaje linfatico', 'masaje')`, consultar el campo `max_concurrent` del `treatment_type` de la cita candidata y de las citas existentes en el mismo bloque.
- Si el tratamiento candidato tiene `max_concurrent = 1`, verificar que no haya ninguna otra cita en ese bloque para ese profesional.
- Si ya existe una cita con un tratamiento que tiene `max_concurrent = 1` en ese bloque, rechazar cualquier nueva cita en el mismo bloque.
- Si `max_concurrent > 1`, el limite es `MIN(max_concurrent, sub_slots_per_block)`.

### 3. UI: Dialogs de tratamiento

En `NewTreatmentDialog` y `EditTreatmentDialog`:

- Agregar un campo numerico "Pacientes simultaneos" con valor por defecto 2 (o el de la clinica).
- Cuando el valor es 1, mostrar un badge/nota: "Exclusivo: el profesional no podra atender otros pacientes en el mismo horario".
- Rango permitido: 1-(el numero de sub-slots disponibles en la clínica).

### 4. UI: Tarjeta de tratamiento en la pagina Treatments

- Mostrar un indicador visual cuando `max_concurrent = 1` (badge "Exclusivo") para que sea claro desde el listado.

### 5. Limpiar constante hardcodeada

- Eliminar `TREATMENTS_EXCLUSIVOS` de `src/constants/treatments.ts` y todas sus referencias en el codigo frontend (`checkConflictInDb.ts`, `validateExclusiveTreatment.ts`).
- La validacion de exclusividad queda 100% del lado del servidor (RPCs) usando el campo `max_concurrent`.

### 6. Hook useTreatments

- Incluir `max_concurrent` en el tipo `TreatmentWithPractitioners` para que la UI pueda mostrar el badge.

## Secuencia

1. Migracion DB (agregar columna)
2. Actualizar RPCs con nueva logica
3. Actualizar dialogs y pagina de tratamientos
4. Limpiar codigo hardcodeado