

## Analysis

You're correct. If the 3 practitioners for this clinic produce 49 time blocks on Wednesday, and each can attend 2 patients simultaneously, the capacity should be **49 × 2 = 98**.

The problem: the `capacity` field in `practitioner_availability` is currently **1** for all records. The report code already uses this field (line 101: `const concurrent = a.capacity || 1`), so the fix is straightforward.

## Plan

### 1. Update existing `capacity` values in the database
Run an UPDATE to set `capacity = 2` for all `practitioner_availability` records in this clinic (since all professionals currently handle 2 simultaneous patients).

### 2. Add capacity editor to the Availability screen
In `src/pages/Availability.tsx` and `src/components/practitioners/AvailabilityEditor.tsx`, add a numeric input (1–10) for "Pacientes simultáneos" per practitioner-day or globally per practitioner. This value maps directly to the `capacity` column already saved on each availability row.

### 3. Ensure save logic persists the capacity value
Currently `handleSave` in `Availability.tsx` hardcodes `capacity: 1` (line ~100). Update it to use the value configured by the user in the editor.

### Technical details
- The `AvailabilityDay` type needs a `capacity` field (or a top-level per-practitioner capacity).
- The `dbAvailabilityToEditor` helper in `src/utils/availabilityHelpers.ts` needs to read and pass through the `capacity` value.
- No schema migration needed — the column already exists with default 1.

