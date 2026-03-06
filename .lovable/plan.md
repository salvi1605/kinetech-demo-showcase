

# Plan: Auditoría completa de acciones en citas

## Objetivo
Registrar automáticamente **quién** creó y **quién** modificó cada cita, y mantener un historial completo de **todos los cambios** (no solo cambios de estado, sino también reprogramaciones de fecha/hora/profesional).

## Cambios necesarios

### 1. Actualizar RPCs para capturar `auth.uid()` (migración SQL)

Modificar las 3 funciones RPC existentes:

- **`validate_and_create_appointment`**: Agregar `created_by = auth.uid()` y `updated_by = auth.uid()` en el INSERT.
- **`validate_and_update_appointment`**: Agregar `updated_by = auth.uid()` en el UPDATE. Además, insertar un registro en `audit_log` con los campos que cambiaron (fecha anterior → nueva, hora anterior → nueva, profesional anterior → nuevo, estado anterior → nuevo).
- **`validate_and_create_appointments_batch`**: Hereda el fix del create individual.

### 2. Habilitar INSERT en `audit_log` para funciones SECURITY DEFINER

La tabla `audit_log` actualmente no permite INSERT desde usuarios. Como las RPCs son `SECURITY DEFINER`, pueden insertar directamente sin necesidad de cambiar políticas RLS.

### 3. Registrar cambios en `audit_log`

Cada vez que se actualiza una cita, el RPC insertará en `audit_log`:
```sql
INSERT INTO audit_log (clinic_id, user_id, entity_type, entity_id, action, payload)
VALUES (
  v_current.clinic_id,
  auth.uid(),
  'appointment',
  p_appointment_id,
  'update',  -- o 'create', 'cancel', 'reschedule'
  jsonb_build_object(
    'changes', jsonb_build_object(
      'date', jsonb_build_object('from', old_date, 'to', new_date),
      'start_time', jsonb_build_object('from', old_time, 'to', new_time),
      'practitioner_id', jsonb_build_object('from', old_prac, 'to', new_prac),
      'status', jsonb_build_object('from', old_status, 'to', new_status)
    )
  )
);
```

También se insertará un registro `action = 'create'` en la creación.

### 4. Detalle técnico

- `auth.uid()` devuelve el UUID del usuario autenticado de Supabase (auth), **no** el `users.id`. Se almacenará el `auth_user_id` en `created_by`/`updated_by` y `audit_log.user_id` ya que es consistente con el sistema existente de `appointment_status_history.changed_by`.
- Solo se registran en el payload los campos que **realmente cambiaron**, para evitar ruido.
- No se requieren cambios en el frontend; todo ocurre a nivel de base de datos.

### Resumen de cambios
| Componente | Cambio |
|---|---|
| RPC `validate_and_create_appointment` | Agregar `created_by = auth.uid()`, `updated_by = auth.uid()`, INSERT en `audit_log` |
| RPC `validate_and_update_appointment` | Agregar `updated_by = auth.uid()`, INSERT en `audit_log` con diff de cambios |
| RPC `validate_and_create_appointments_batch` | Hereda del create individual |
| Tablas | Sin cambios de schema (los campos `created_by`, `updated_by` ya existen en `appointments`) |

