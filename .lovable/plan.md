

# Fix: Sub-slot off-by-one error in appointment creation

## Problem

The calendar grid uses **0-based** indices internally (`subIndex = 0, 1, 2, 3, 4`) but the database and RPC expect **1-based** sub_slots (`1, 2, 3, 4, 5`).

When clicking the 3rd slot visually, `subIndex = 2` is passed through `onSubSlotClick` → `selectedSlot.subSlot` → `NewAppointmentDialog` → RPC as `p_sub_slot = 2`, storing it as sub_slot 2 instead of 3.

## Root Cause

`src/pages/Calendar.tsx` line 906:
```typescript
onClick={() => onSubSlotClick({ dayIndex, time, subSlot: subIndex })}
```
`subIndex` is 0-based but should be converted to 1-based before passing to the dialog.

## Fix

**File: `src/pages/Calendar.tsx`** — Convert `subIndex` to 1-based at the point where it enters `onSubSlotClick`. There are multiple call sites for `onSubSlotClick` passing 0-based `subIndex`:

1. Desktop grid empty slot click (~line 906): `subSlot: subIndex` → `subSlot: subIndex + 1`
2. Mobile grid empty slot click (similar pattern further down): same fix

This is a 2-line change. The `appointmentsBySlotKey` map indexing (which is 0-based internally for lookup) remains unchanged — only the value passed to the dialog/RPC is corrected.

## Verification

After fix: clicking visual slot 3 → `selectedSlot.subSlot = 3` → RPC receives `p_sub_slot = 3` → DB stores `sub_slot = 3`.

