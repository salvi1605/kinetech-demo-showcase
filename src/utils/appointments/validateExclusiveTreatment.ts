// Treatment exclusivity validation is now handled server-side via max_concurrent field in treatment_types table.
// The RPCs validate_and_create_appointment and validate_and_update_appointment enforce this.
// This file is kept as a stub for backward compatibility.

export function hasExclusiveConflict(): { ok: boolean } {
  // Server-side validation only
  return { ok: true };
}
