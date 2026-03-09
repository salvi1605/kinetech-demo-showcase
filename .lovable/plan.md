

## Problem: Duplicate Evolution Notes (648 appointments affected)

The `patient_clinical_notes` table has **648 appointments with duplicate evolution entries**. This is what causes the multiple textboxes and text duplication the professionals are seeing.

### Root Cause

Two issues working together:

1. **No unique constraint** on `(appointment_id, note_type)` in the `patient_clinical_notes` table. Nothing prevents duplicate rows at the DB level.

2. **Race condition** in `usePatientClinicalNotes.ts`: When the hook creates missing evolution stubs (bulk insert), the **realtime subscription** detects the insert and triggers `fetchData()` again. The second call races with the first, finds the same "missing" appointments, and inserts another batch of stubs before the first batch is visible.

### Plan

#### 1. Clean up existing duplicates and add unique constraint (DB migration)

```sql
-- Delete duplicate rows, keeping the one with the most content (longest body) or oldest
DELETE FROM patient_clinical_notes
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY appointment_id, note_type
        ORDER BY LENGTH(COALESCE(body,'')) DESC, created_at ASC
      ) as rn
    FROM patient_clinical_notes
    WHERE appointment_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_unique_evolution_per_appointment
  ON patient_clinical_notes (appointment_id, note_type)
  WHERE appointment_id IS NOT NULL;
```

#### 2. Fix race condition in `usePatientClinicalNotes.ts`

- Add a `useRef` lock (`isFetchingRef`) to prevent concurrent `fetchData` calls.
- Use `INSERT ... ON CONFLICT DO NOTHING` via upsert for stub creation instead of plain insert, so even if the race happens, duplicates won't be created.

#### 3. Fix stub insert to use upsert in `usePatientClinicalNotes.ts`

Replace the bulk `.insert(inserts)` with `.upsert(inserts, { onConflict: 'appointment_id,note_type' })` so it gracefully handles the case where stubs already exist.

### Files to modify
- `usePatientClinicalNotes.ts` — add fetch lock + upsert instead of insert
- DB migration — cleanup + unique index

