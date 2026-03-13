

# Remove attendance marking from health_pro role

## What changes

The tri-state attendance checkbox in the calendar and the status field in the appointment edit dialog should not be available to the `health_pro` role. Currently, `health_pro` is included in the permission check for these features.

## Changes

### 1. `src/pages/Calendar.tsx` — Remove `health_pro` from checkbox permission (2 locations)

- **Line 770**: Change `['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro']` to `['admin_clinic', 'tenant_owner', 'receptionist']`
- **Line 1379**: Same change — remove `'health_pro'` from the permission array

This hides the tri-state attendance checkbox (Asistió / No Asistió toggle) from professionals.

### 2. `src/components/dialogs/AppointmentDetailDialog.tsx` — Disable status field for health_pro

- **Line 663**: The status `Select` is controlled by `disabled={!canEdit}`. Add an additional condition: disable the status dropdown when the user role is `health_pro`, so professionals can view the current status but cannot change it. Change to `disabled={!canEdit || state.userRole === 'health_pro'}`.

This ensures that even when a professional opens the edit form, they cannot modify the attendance status.

## No backend changes needed
The RLS policies remain unchanged — this is purely a UI permission restriction.

