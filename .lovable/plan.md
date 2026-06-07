
## Objetivo

Que el badge **"N"** (paciente nuevo) se comporte de forma idéntica para `health_pro`, `receptionist`, `admin_clinic` y `tenant_owner`, y que cuando la primera cita pase a `no_show` o `cancelled` el badge **salte automáticamente al siguiente turno agendado/realizado** (porque el paciente "todavía no vino por primera vez").

## Causas raíz a corregir

1. **Asimetría RLS**: `useFirstVisitPatients` calcula `MIN(date)` desde el cliente. Con RLS, `health_pro` ve solo sus citas, mientras `receptionist` ve todas las de la clínica → la "primera cita" da fechas distintas según el rol.
2. **Filtro de status sin RPC**: Hoy se filtra `status IN ('scheduled','completed')` en el cliente, pero como el cálculo ya está sesgado por RLS, el resultado es inconsistente.

## Solución (Opción C — RPC `SECURITY DEFINER`)

Mover el cálculo a una función Postgres `SECURITY DEFINER` que ignora RLS y devuelve, para cada paciente, la **fecha del próximo turno "primera visita pendiente"**: el `MIN(date, start_time)` entre los turnos con `status IN ('scheduled','completed')` de toda la clínica. Si el primero pasa a `no_show`/`cancelled`, el `MIN` recae automáticamente en el siguiente válido y el badge se mueve solo.

## Cambios técnicos

### 1) Nueva RPC `get_first_visit_dates`

```text
get_first_visit_dates(p_clinic_id uuid, p_patient_ids uuid[])
  returns table(patient_id uuid, first_date date)
  language sql
  stable
  security definer
  set search_path = public
```

Lógica:
- Para cada `patient_id` en `p_patient_ids`, retorna el `MIN(date)` de `appointments` donde:
  - `clinic_id = p_clinic_id`
  - `patient_id = ANY(p_patient_ids)`
  - `status IN ('scheduled','completed')` (excluye `no_show` y `cancelled` → así el badge salta)
- Guard de autorización dentro de la función: el caller debe ser `is_admin_clinic(p_clinic_id)`, `is_receptionist(p_clinic_id)` o `is_health_pro(p_clinic_id)`. Si no, devuelve set vacío.
- `GRANT EXECUTE ... TO authenticated`.

Esto elimina la asimetría RLS sin filtrar datos sensibles (solo devuelve `patient_id` + `date` para IDs que el caller ya conoce de su vista).

### 2) Refactor `src/hooks/useFirstVisitPatients.ts`

Reemplazar el `supabase.from('appointments').select(...)` por:

```text
supabase.rpc('get_first_visit_dates', {
  p_clinic_id: clinicId,
  p_patient_ids: patientIds,
})
```

El resto del hook (recorte a la semana visible vía `weekStartISO`/`weekEndISO`) se mantiene igual.

### 3) Refresco reactivo

Suscribirse (o invalidar) ante cambios de `appointments` para que cuando una cita pase a `no_show`/`cancelled`, el badge se recalcule sin recargar la página. Opciones:
- Reutilizar el canal `postgres_changes` ya existente de la agenda y, en su callback, forzar un refetch del hook (bump de una dep o exponer `refetch`).
- Alternativa mínima: agregar como dep un "tick" que cambia cuando el reducer aplica `UPDATE_APPOINTMENT_STATUS`.

Implementaré la alternativa mínima para no tocar la suscripción global.

## Por qué resuelve ambos casos

- **Marianela (recepcionista)**: la RPC ignora RLS → ve el mismo `MIN(date)` que un `health_pro` con acceso completo. Badge consistente entre roles.
- **Salto en no_show**: la RPC excluye `no_show`/`cancelled`, así que el `MIN` salta naturalmente al siguiente turno `scheduled`/`completed`. Cuando ese turno cae en la semana visible, el badge "N" aparece ahí.

## Fuera de alcance

- No se cambia el esquema (`patients` no recibe nueva columna).
- No se toca la definición de "paciente nuevo" en reportes ni en otras vistas.
- No se modifican RLS de `appointments`.

## Validación post-implementación

1. Crear paciente nuevo + 2 turnos futuros. Verifico badge en el primero (rol recep y rol health_pro).
2. Marcar el primero como `no_show` → badge debe moverse al segundo en ambos roles.
3. Cancelar el segundo → badge salta al tercero (si existe) o desaparece.
4. Confirmar que un paciente con historial previo (turnos `completed` antiguos) no recibe badge.
