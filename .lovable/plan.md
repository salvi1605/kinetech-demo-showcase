

## Fix: Sincronizar treatment_type en notas clínicas al actualizar cita

### Problema
Cuando Marianela cambia el tipo de tratamiento de una cita (ej: FKT → ATM) desde el detalle de la cita, el cambio se guarda correctamente en la tabla `appointments` (por eso en la agenda aparece bien). Pero la tabla `patient_clinical_notes` conserva el valor original que se copió al momento de **crear** la cita — porque el trigger `trg_create_evolution_stub` solo se ejecuta en INSERT, no en UPDATE.

Resultado: Mirian abre la ficha clínica y ve "FKT" cuando debería ver "ATM".

### Solución
Crear un trigger AFTER UPDATE en `appointments` que, cuando cambie `treatment_type_id`, sincronice el campo `treatment_type` en `patient_clinical_notes`.

### Cambio técnico

**Nueva migración SQL** — un solo trigger:

```sql
CREATE OR REPLACE FUNCTION public.fn_sync_evolution_treatment_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_treatment_name TEXT;
BEGIN
  -- Only act when treatment_type_id actually changed
  IF NEW.treatment_type_id IS DISTINCT FROM OLD.treatment_type_id THEN
    -- Resolve new treatment name
    SELECT name INTO v_treatment_name
    FROM treatment_types
    WHERE id = NEW.treatment_type_id;

    v_treatment_name := COALESCE(v_treatment_name, 'FKT');

    -- Update matching evolution note
    UPDATE patient_clinical_notes
    SET treatment_type = v_treatment_name,
        updated_at = now()
    WHERE appointment_id = NEW.id
      AND note_type = 'evolution';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_evolution_treatment
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_evolution_treatment_type();
```

### Archivos
| Cambio | Detalle |
|---|---|
| Nueva migración SQL | Trigger AFTER UPDATE que sincroniza `treatment_type` en notas clínicas |

No requiere cambios en frontend — la sincronización es automática a nivel de DB y el realtime ya está suscrito a `patient_clinical_notes`.

### Resultado
- Al cambiar tratamiento en la agenda → la ficha clínica refleja el cambio inmediatamente
- No afecta citas nuevas (el trigger INSERT existente sigue funcionando)
- Sin riesgo de regresión — solo actúa cuando `treatment_type_id` realmente cambia

