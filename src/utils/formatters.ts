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
const capitalize = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

/**
 * Genera un nombre compacto para mostrar en el calendario.
 * Formato: "Apellido1 I. Nombre1"
 * Ej: first_surname="ALVAREZ", second_surname="ARROYO", first_name="LEILANY" → "Alvarez A. Leilany"
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
    let result = capitalize(patient.first_surname);
    if (patient.second_surname) {
      result += ` ${patient.second_surname.charAt(0).toUpperCase()}.`;
    }
    result += ` ${capitalize(patient.first_name)}`;
    return result;
  }
  // Fallback: usar name o full_name truncado
  const fallback = patient.name || patient.full_name || 'Paciente';
  // Capitalizar cada palabra del fallback
  const capitalized = fallback.split(' ').map(capitalize).join(' ');
  return capitalized.length > 25 ? capitalized.substring(0, 22) + '...' : capitalized;
};
