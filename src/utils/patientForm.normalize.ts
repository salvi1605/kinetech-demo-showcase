import { parseSmartDOB, toStoreDOB } from './dateUtils';

export type Lateralidad = 'Derecha' | 'Izquierda' | 'Bilateral' | '';
export type ObraSocial = 'osde' | 'luis_pasteur' | 'particular' | '';
export type ReminderPref = '24h' | 'none' | '';

export type PatientForm = {
  identificacion: {
    fullName: string;
    preferredName: string;
    documentId: string;
    dateOfBirth: string;
    mobilePhone: string;
    email: string;
  };
  emergencia: {
    contactName: string;
    relationship: string;
    emergencyPhone: string;
  };
  clinico: {
    mainReason: string;
    diagnosis: string;
    laterality: Lateralidad;
    painLevel: number;
    redFlags: { embarazo: boolean; cancer: boolean; marcapasos: boolean; };
    restricciones: { noMagnetoterapia: boolean; noElectroterapia: boolean; };
  };
  seguro: {
    obraSocial: ObraSocial;
    numeroAfiliado?: string;
    sesionesAutorizadas?: number;
    copago?: number;
    contactAuth: { whatsapp: boolean; email: boolean; };
    reminderPref: ReminderPref;
  };
};

// Normalizar el formulario asegurando valores por defecto
export const normalizePatientForm = (f: PatientForm): PatientForm => ({
  identificacion: {
    fullName: f.identificacion?.fullName ?? '',
    preferredName: f.identificacion?.preferredName ?? '',
    documentId: f.identificacion?.documentId ?? '',
    dateOfBirth: f.identificacion?.dateOfBirth ?? '',
    mobilePhone: f.identificacion?.mobilePhone ?? '',
    email: f.identificacion?.email ?? '',
  },
  emergencia: {
    contactName: f.emergencia?.contactName ?? '',
    relationship: f.emergencia?.relationship ?? '',
    emergencyPhone: f.emergencia?.emergencyPhone ?? '',
  },
  clinico: {
    mainReason: f.clinico?.mainReason ?? '',
    diagnosis: f.clinico?.diagnosis ?? '',
    laterality: f.clinico?.laterality ?? '',
    painLevel: Number.isFinite(f.clinico?.painLevel) ? f.clinico.painLevel : 0,
    redFlags: {
      embarazo: !!f.clinico?.redFlags?.embarazo,
      cancer: !!f.clinico?.redFlags?.cancer,
      marcapasos: !!f.clinico?.redFlags?.marcapasos,
    },
    restricciones: {
      noMagnetoterapia: !!f.clinico?.restricciones?.noMagnetoterapia,
      noElectroterapia: !!f.clinico?.restricciones?.noElectroterapia,
    },
  },
  seguro: {
    obraSocial: f.seguro?.obraSocial ?? '',
    numeroAfiliado: f.seguro?.numeroAfiliado ?? '',
    sesionesAutorizadas: typeof f.seguro?.sesionesAutorizadas === 'number' ? f.seguro.sesionesAutorizadas : undefined,
    copago: typeof f.seguro?.copago === 'number' ? f.seguro.copago : undefined,
    contactAuth: {
      whatsapp: !!f.seguro?.contactAuth?.whatsapp,
      email: !!f.seguro?.contactAuth?.email,
    },
    reminderPref: f.seguro?.reminderPref ?? 'none',
  }
});

// Convertir desde el paciente persistido a PatientForm (para Editar)
export const toFormFromPatient = (p: any): PatientForm => {
  // Obtener y convertir fecha de nacimiento a formato DD-MM-YYYY
  let dateOfBirth = '';
  const dobSource = p?.identificacion?.dateOfBirth || p?.birthDate;
  if (dobSource) {
    try {
      const parsed = parseSmartDOB(dobSource);
      dateOfBirth = toStoreDOB(parsed);
    } catch {
      dateOfBirth = dobSource; // fallback al valor original si falla el parsing
    }
  }

  return {
    identificacion: {
      fullName: p?.identificacion?.fullName || p?.name || '',
      preferredName: p?.identificacion?.preferredName ?? '',
      documentId: p?.identificacion?.documentId ?? '',
      dateOfBirth,
      mobilePhone: p?.identificacion?.mobilePhone || p?.phone || '',
      email: p?.identificacion?.email || p?.email || '',
    },
  emergencia: {
    contactName: p?.emergencia?.contactName ?? '',
    relationship: p?.emergencia?.relationship ?? '',
    emergencyPhone: p?.emergencia?.emergencyPhone ?? '',
  },
  clinico: {
    mainReason: p?.clinico?.mainReason ?? '',
    diagnosis: p?.clinico?.diagnosis ?? '',
    laterality: p?.clinico?.laterality ?? '',
    painLevel: p?.clinico?.painLevel ?? 0,
    redFlags: {
      embarazo: !!p?.clinico?.redFlags?.embarazo,
      cancer: !!p?.clinico?.redFlags?.cancer,
      marcapasos: !!p?.clinico?.redFlags?.marcapasos,
    },
    restricciones: {
      noMagnetoterapia: !!p?.clinico?.restricciones?.noMagnetoterapia,
      noElectroterapia: !!p?.clinico?.restricciones?.noElectroterapia,
    },
  },
  seguro: {
    obraSocial: p?.seguro?.obraSocial ?? '',
    numeroAfiliado: p?.seguro?.numeroAfiliado ?? '',
    sesionesAutorizadas: p?.seguro?.sesionesAutorizadas ?? undefined,
    copago: p?.seguro?.copago ?? undefined,
    contactAuth: {
      whatsapp: !!p?.seguro?.contactAuth?.whatsapp,
      email: !!p?.seguro?.contactAuth?.email,
    },
    reminderPref: p?.seguro?.reminderPref ?? 'none',
  }
  };
};

// Convertir PatientForm a Patient para guardar
export const toPatientFromForm = (id: string, form: PatientForm): any => ({
  id,
  name: form.identificacion.fullName,
  email: form.identificacion.email || '',
  phone: form.identificacion.mobilePhone,
  birthDate: form.identificacion.dateOfBirth,
  conditions: [
    ...(form.clinico.redFlags?.embarazo ? ['Embarazo'] : []),
    ...(form.clinico.redFlags?.cancer ? ['Cáncer'] : []),
    ...(form.clinico.redFlags?.marcapasos ? ['Marcapasos'] : []),
    ...(form.clinico.restricciones?.noMagnetoterapia ? ['No Magnetoterapia'] : []),
    ...(form.clinico.restricciones?.noElectroterapia ? ['No Electroterapia'] : []),
  ],
  // Guardar el formulario completo en campos adicionales
  identificacion: form.identificacion,
  emergencia: form.emergencia,
  clinico: form.clinico,
  seguro: form.seguro,
});
