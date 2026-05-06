// Persists the user's chosen (clinicId, roleId) for users with multiple roles
// in the same clinic, so token refreshes don't reset their role choice.
// Uses sessionStorage so it dies on browser close (no cross-session leaks).

const KEY = 'agendix.selectedRoleByClinic';

export interface SelectedRole {
  clinicId: string;
  roleId: string;
}

export const getSelectedRole = (): SelectedRole | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.clinicId === 'string' && typeof parsed.roleId === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const setSelectedRole = (sel: SelectedRole): void => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(sel));
  } catch {
    // ignore
  }
};

export const clearSelectedRole = (): void => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
