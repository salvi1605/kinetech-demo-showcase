
## Problema

La función `validate_and_create_appointment` (que se ejecuta al **crear** turnos nuevos) **no valida los bloqueos de profesional** (`schedule_exceptions` de tipo `practitioner_block`). Como resultado, las recepcionistas pueden agendar pacientes en días/horarios que el profesional marcó como bloqueados.

La función `validate_and_update_appointment` (al editar/mover) sí valida esto correctamente, lo que confirma que el comportamiento esperado es bloquear.

**Caso concreto:** Vicky bloqueó el 14/05/2026 el 09/03/2026. Entre el 08/04 y el 30/04 se agendaron 6 citas en ese día sin que el sistema avisara.

## Cambios a realizar

### 1. Backend (migración SQL) — fuente de verdad

Actualizar la función `validate_and_create_appointment` para que, antes de crear, consulte `schedule_exceptions` y rechace si el profesional tiene un `practitioner_block` que cubre la fecha/hora pedida. Misma lógica que ya tiene `validate_and_update_appointment`:

- Si existe un `practitioner_block` con `from_time` y `to_time` NULL → bloqueo de día completo → rechazar.
- Si tiene rango horario → rechazar solo si la hora pedida cae dentro del rango.
- Devolver `error_code: 'BLOCKED'` con mensaje claro: "Profesional no disponible: [razón o 'BLOQUEO']".

Aplicar la misma validación al inicio del flujo en `validate_and_create_appointments_batch` (citas masivas) ya que delega en `validate_and_create_appointment`, queda cubierto automáticamente.

### 2. Frontend — feedback visual al crear

En `NewAppointmentDialog.tsx`, `MassCreateAppointmentDialog.tsx` y `FreeAppointmentDialog.tsx`, usar el hook `useScheduleExceptions` (ya existe y expone `isBlocked(date, time, practitionerId)`):

- Al elegir profesional + fecha + hora, si `isBlocked()` devuelve `true`, mostrar mensaje rojo inline ("Profesional bloqueado este día/horario: [razón]") y deshabilitar el botón "Crear".
- En el calendario principal (`Calendar.tsx`), pintar visualmente los slots bloqueados del profesional seleccionado en el filtro (ya hay patrón similar para slots ocupados — ver memoria `calendar-practitioner-filter-occupied-slots`).

### 3. Manejar las 6 citas ya existentes del 14/05

Estas citas ya están agendadas en un día que Vicky bloqueó. **Necesito tu decisión** sobre qué hacer con ellas (te lo pregunto antes de tocar nada):

- Opción A: Cancelarlas todas y avisar a las pacientes.
- Opción B: Dejarlas y que vos/Marianela coordinen manualmente con Vicky.
- Opción C: Reasignarlas a otro profesional disponible.

Mi recomendación es **avisar a Marianela primero** para que coordine — el sistema no debería decidir esto solo.

### 4. Auditoría preventiva

Como mencionaste que esto no es la primera vez, después del fix voy a correr una consulta para listar **todas las citas activas que actualmente caen en un `practitioner_block`** en cualquier fecha futura. Te paso el listado para que puedan revisarlas con las clínicas.

## Detalles técnicos

- Migración SQL con `DROP FUNCTION` previo (regla `rpc-evolution-policy`) para `validate_and_create_appointment`.
- No tocar `validate_and_update_appointment` (ya funciona bien).
- No cambiar el shape del retorno JSON — solo agregar el caso `BLOCKED`.
- Frontend: leer error_code === 'BLOCKED' y mostrar toast con el mensaje del backend.

## Validación

1. Crear excepción de prueba para un profesional en una fecha futura.
2. Intentar agendar desde recepción → debe fallar con mensaje claro.
3. Intentar carga masiva → debe fallar para esa fecha y permitir el resto.
4. Intentar mover una cita a esa fecha → debe seguir fallando (regresión).
5. Confirmar que el slot se ve bloqueado visualmente en el calendario.
