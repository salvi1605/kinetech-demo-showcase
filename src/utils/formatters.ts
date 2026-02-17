export const treatmentLabel: Record<string, string> = {
  "": "",
  fkt: "FKT",
  atm: "ATM",
  drenaje: "Drenaje linfático",
  drenaje_ultra: "Drenaje + Ultrasonido",
  masaje: "Masaje",
  vestibular: "Vestibular",
  otro: "Otro",
};

/**
 * Capitaliza la primera letra y pone el resto en minúsculas
 */
export const capitalize = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

/**
 * Helper para buscar en campos estructurados del paciente.
 * Retorna true si algún campo contiene el término de búsqueda.
 */
export const matchesPatientSearch = (patient: {
  name?: string;
  full_name?: string;
  first_surname?: string | null;
  second_surname?: string | null;
  first_name?: string | null;
  second_name?: string | null;
}, searchLower: string): boolean => {
  return (
    (patient.name?.toLowerCase().includes(searchLower) ?? false) ||
    (patient.full_name?.toLowerCase().includes(searchLower) ?? false) ||
    (patient.first_surname?.toLowerCase().includes(searchLower) ?? false) ||
    (patient.second_surname?.toLowerCase().includes(searchLower) ?? false) ||
    (patient.first_name?.toLowerCase().includes(searchLower) ?? false) ||
    (patient.second_name?.toLowerCase().includes(searchLower) ?? false)
  );
};

/**
 * Genera un nombre completo formateado y capitalizado desde campos estructurados.
 * Formato: "Apellido1 [Apellido2] Nombre1 [Nombre2]"
 * Ej: "Alvarez Arroyo Leilany Carolina"
 */
export const formatPatientFullName = (patient: {
  first_surname?: string | null;
  second_surname?: string | null;
  first_name?: string | null;
  second_name?: string | null;
  name?: string;
  full_name?: string;
}): string => {
  if (patient.first_surname && patient.first_name) {
    const parts = [
      capitalize(patient.first_surname),
      patient.second_surname ? capitalize(patient.second_surname) : null,
      capitalize(patient.first_name),
      patient.second_name ? capitalize(patient.second_name) : null,
    ].filter(Boolean);
    return parts.join(' ');
  }
  // Fallback: capitalizar cada palabra de name o full_name
  const fallback = patient.name || patient.full_name || 'Paciente';
  return fallback.split(' ').map(capitalize).join(' ');
};

/**
 * Genera un nombre compacto para mostrar en el calendario.
 * Formato: "Apellido1 N." (primer apellido + inicial del primer nombre)
 * Ej: first_surname="ALVAREZ", first_name="LEILANY" → "Alvarez L."
 */
export const formatPatientShortName = (patient: {
  first_surname?: string | null;
  second_surname?: string | null;
  first_name?: string | null;
  second_name?: string | null;
  name?: string;
  full_name?: string;
}): string => {
  if (patient.first_surname && patient.first_name) {
    return `${capitalize(patient.first_surname)} ${patient.first_name.charAt(0).toUpperCase()}.`;
  }
  // Fallback: usar name o full_name truncado
  const fallback = patient.name || patient.full_name || 'Paciente';
  const capitalized = fallback.split(' ').map(capitalize).join(' ');
  return capitalized.length > 25 ? capitalized.substring(0, 22) + '...' : capitalized;
};
