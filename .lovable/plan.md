

## Problem

Two things create evolution stubs simultaneously:
1. **Trigger** `fn_create_evolution_stub` — fires on `INSERT INTO appointments`
2. **RPC** `validate_and_create_appointment` — step 8, explicit INSERT

The trigger runs first (as part of the appointment INSERT in step 7), so by the time step 8 executes, the stub already exists and the unique index `idx_unique_evolution_per_appointment` rejects it.

## Fix

**Database migration** — Update the RPC `validate_and_create_appointment` to add `ON CONFLICT DO NOTHING` to the evolution stub INSERT in step 8:

```sql
INSERT INTO patient_clinical_notes (...)
VALUES (...)
ON CONFLICT (appointment_id, note_type) WHERE appointment_id IS NOT NULL
DO NOTHING;
```

This is a one-line change to the existing RPC. The trigger handles stub creation; the RPC's insert becomes a safe no-op fallback.

No frontend code changes needed.

