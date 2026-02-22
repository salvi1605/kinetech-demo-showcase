

# Analisis de causa raiz: Reprogramacion bloqueada

## Flujo de reprogramacion (onSubmit, lineas 255-337)

Cuando el usuario confirma "Guardar cambios" al reprogramar, el codigo ejecuta 3 validaciones en secuencia antes del UPDATE en BD. Cualquiera de ellas puede bloquear. Ademas, la propia escritura en BD puede fallar por una restriccion de unicidad.

```text
onSubmit()
  |
  v
[1] isPast + role check (L259)  --> "Acceso denegado"
  |
  v
[2] checkPractitionerAvailability (L270)  --> "Fuera de horario"
  |
  v
[3] checkConflictInDb (L290)  --> "Conflicto de disponibilidad"
  |
  v
[4] updateAppointmentInDb (L311)  --> DB unique constraint error
                                      --> "No se pudo actualizar el turno"
```

---

## Punto de bloqueo 1: Validacion de dia pasado (probable si la cita original es de abril 2025)

**Archivo**: `AppointmentDetailDialog.tsx`, lineas 131-133 y 259-266

La variable `isPast` se calcula a partir de la fecha ORIGINAL de la cita (no la nueva fecha seleccionada):

```text
const appointmentDateISO = appointment.date  // fecha ORIGINAL
const isPast = isPastDay(appointmentDateISO)  // true si < hoy
const canEdit = role in [admin, owner] || !isPast
```

- Si `isPast = true` y el usuario NO es admin/owner, `canEdit = false` y el boton "Reprogramar" no aparece. El usuario no llegaria a este punto.
- Si el usuario ES admin/owner, `canEdit = true` y el check en linea 259 se omite (admin excluido).
- **Conclusion**: Este punto NO es el bloqueante para admins.

---

## Punto de bloqueo 2: Validacion de disponibilidad del profesional (MUY PROBABLE)

**Archivo**: `AppointmentDetailDialog.tsx`, lineas 270-285
**Archivo**: `checkPractitionerAvailability.ts`

La validacion consulta la tabla `practitioner_availability` para el dia de la semana de la NUEVA fecha. Si el profesional tiene disponibilidad configurada para ALGUN dia pero NO para el dia de la semana objetivo, retorna:

```text
{
  available: false,
  message: "El profesional no tiene disponibilidad configurada para los [dia]"
}
```

Toast mostrado: **"Fuera de horario - [nombre]: El profesional no tiene disponibilidad configurada para los [dia]"**

Escenario tipico: el profesional tiene horarios de lunes a viernes pero el usuario intenta reprogramar a un sabado, o el profesional solo tiene disponibilidad lunes/miercoles/viernes y se intenta mover a un martes.

Tambien bloquea si la hora nueva (ej. 08:00) esta fuera de las franjas configuradas (ej. el profesional trabaja 09:00-18:00).

---

## Punto de bloqueo 3: Conflicto de sub_slot en BD (PROBABLE con mensaje generico)

**Indice unico en BD**:
```text
UNIQUE (clinic_id, practitioner_id, date, start_time, sub_slot)
```

**Defecto critico**: Al reprogramar (lineas 311-318), el codigo NO envia `subSlot`:

```text
await updateAppointmentInDb(appointment.id, {
  date: data.date,
  startTime: data.startTime,
  practitionerId: data.practitionerId,
  status: data.status,
  treatmentType: ...,
  notes: ...
  // sub_slot NO se envia -> mantiene el valor original
});
```

En `appointmentService.ts` (linea 73): `if (updates.subSlot !== undefined) dbUpdates.sub_slot = updates.subSlot;` -- como subSlot es `undefined`, el campo NO se incluye en el UPDATE. El sub_slot original se preserva.

**Consecuencia**: Si la cita original tenia sub_slot = 2 y en el nuevo horario ya existe otra cita con sub_slot = 2, el UPDATE falla con un error de constraint unico. El catch en linea 330-336 muestra:

Toast: **"Error - No se pudo actualizar el turno"** (sin explicacion de la causa)

Ademas, este indice unico incluye citas canceladas. Una cita cancelada en el slot destino tambien bloquearia la reprogramacion.

---

## Punto de bloqueo 4: Join !inner con treatment_types (NO bloqueante pero incorrecto)

En `checkConflictInDb.ts`, linea 35-38:
```text
.select(`id, start_time, treatment_types!inner(name)`)
```

El `!inner` hace un INNER JOIN con treatment_types via treatment_type_id. Pero TODAS las citas tienen `treatment_type_id = NULL` (ver appointmentService.ts lineas 57, 78). Un INNER JOIN con FK nula excluye esas filas, por lo que la query siempre retorna 0 resultados. Esto hace que la validacion de tratamientos exclusivos sea inoperante (nunca detecta conflictos), pero tampoco bloquea.

---

## Resumen de causas raiz

| Punto | Causa | Mensaje al usuario | Probabilidad |
|-------|-------|-------------------|-------------|
| 2 | Disponibilidad del profesional no cubre el nuevo dia/hora | "Fuera de horario - ..." | Alta |
| 3 | Sub_slot no se resetea, colision con constraint unico | "No se pudo actualizar el turno" | Alta |
| 4 | checkConflictInDb nunca funciona (join !inner con NULL FK) | N/A (no bloquea) | Defecto latente |

---

## Plan de correccion

### Archivo 1: `src/components/dialogs/AppointmentDetailDialog.tsx`

**Correccion A**: En la funcion `onSubmit`, antes de llamar a `updateAppointmentInDb`, buscar el primer sub_slot libre en el nuevo horario. Si no hay sub_slots libres, mostrar un mensaje claro indicando que todos los turnos de ese bloque estan ocupados.

**Correccion B**: Mejorar el mensaje de error del catch (lineas 330-336) para incluir informacion del error real de la BD en lugar del generico "No se pudo actualizar el turno". Extraer el mensaje del error y verificar si es un constraint violation para dar un mensaje especifico.

**Correccion C**: En la validacion de disponibilidad (lineas 270-285), agregar un mecanismo para que el usuario pueda ver los horarios disponibles del profesional para el dia seleccionado, en vez de solo bloquearlo.

### Archivo 2: `src/utils/appointments/checkConflictInDb.ts`

**Correccion D**: Cambiar el join de `treatment_types!inner(name)` a `treatment_types(name)` (LEFT JOIN) o, mejor aun, leer el `treatment_type` directamente de una columna de texto en appointments (ya que `treatment_type_id` siempre es NULL y el tipo real se almacena como string en el estado local). Alternativamente, buscar la columna `notes` o un campo que contenga el tipo de tratamiento.

### Archivo 3: `src/lib/appointmentService.ts`

**Correccion E**: En `updateAppointment`, cuando se cambia `date` o `startTime`, verificar si se necesita recalcular el sub_slot. Si no se pasa explicitamente, buscar el primer sub_slot disponible en el nuevo bloque.

### Flujo corregido

```text
onSubmit()
  |
  v
[1] isPast + role check (sin cambios)
  |
  v
[2] checkPractitionerAvailability (sin cambios en logica)
  |
  v
[3] Buscar sub_slot libre en nuevo horario (NUEVO)
    - Query: appointments WHERE clinic+practitioner+date+time, status != cancelled
    - Encontrar primer sub_slot disponible de 1 a N (segun clinic_settings.sub_slots_per_block)
    - Si no hay: toast "Todos los turnos de este bloque estan ocupados"
  |
  v
[4] checkConflictInDb con LEFT JOIN (corregido)
  |
  v
[5] updateAppointmentInDb con sub_slot calculado
    - Si falla: mostrar mensaje especifico del error
```

### Detalle de implementacion

**En AppointmentDetailDialog.tsx, dentro de onSubmit, despues de la validacion de disponibilidad**:

1. Consultar cuantos sub_slots_per_block tiene la clinica (de clinic_settings o state)
2. Consultar citas existentes no canceladas en (clinic_id, practitioner_id, new_date, new_startTime)
3. Calcular sub_slots ocupados
4. Encontrar el primer sub_slot libre (1 a max)
5. Si no hay libre: toast descriptivo y return
6. Pasar el sub_slot encontrado a updateAppointmentInDb

**En checkConflictInDb.ts**:

Cambiar linea 38 de `treatment_types!inner(name)` a una consulta que no dependa de treatment_type_id (que siempre es NULL). Opciones:
- Usar LEFT JOIN: `treatment_types(name)` 
- O agregar una columna `treatment_type` de texto a appointments para almacenar el tipo directamente

**En appointmentService.ts, funcion updateAppointment**:

En el catch del error, propagar el mensaje original para que el componente pueda mostrar informacion util al usuario.
