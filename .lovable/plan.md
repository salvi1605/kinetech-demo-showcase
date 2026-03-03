

# Diagnóstico: Problema intermitente de edición de historia clínica para health_pro

## Causa raíz identificada

El problema tiene **dos capas**:

### 1. Frontend: `canEdit` no verifica al profesional autor
En `ClinicalHistoryBlock.tsx`, la función `canEdit` (línea 100) solo verifica:
- Si el rol es `health_pro`
- Si la fecha de la evolución es hoy

**No verifica** si la evolución pertenece al profesional actual. Esto causa que:
- Para pacientes compartidos entre profesionales, Mirian ve evoluciones de OTROS profesionales y el frontend le permite editarlas
- El guardado puede fallar silenciosamente a nivel de RLS si la nota fue creada por otro profesional

### 2. Backend (RLS): la política de UPDATE depende de tener citas con el paciente
La política `clinical_notes_pro_update_assigned` permite actualizar notas si el profesional tiene **cualquier** cita con ese paciente. Esto funciona para pacientes propios pero falla para pacientes que solo atiende otro profesional.

### Resultado observable
- **Funciona**: cuando Mirian edita evoluciones de pacientes con los que ella tiene citas (independientemente de quién creó la nota)
- **No funciona**: cuando intenta editar notas de pacientes con los que NO tiene citas propias, el guardado falla y se guarda solo en localStorage con un toast "Error de conexión" que puede pasar desapercibido

## Plan de corrección

### Cambio 1: Restringir `canEdit` al profesional actual
En `ClinicalHistoryBlock.tsx`, modificar `canEdit` para que `health_pro` solo pueda editar evoluciones donde `entry.doctorId` coincida con el practitioner vinculado al usuario actual.

```text
canEdit(entry):
  if health_pro:
    return entry.date === today AND entry.doctorId === currentPractitionerId
```

Esto requiere pasar `currentPractitionerId` como prop al componente.

### Cambio 2: Obtener el practitioner_id del usuario actual
Agregar al `ClinicalHistoryDialog` la lógica para obtener el `practitioner_id` del usuario logueado (ya disponible en el estado de la app o consultando la tabla `practitioners` por `user_id`).

### Cambio 3: Mejorar feedback de error
En el `saveToDb`, cuando el error es de RLS (403/permission), mostrar un toast más específico: "No tenés permiso para editar esta evolución" en lugar del genérico "Error de conexión".

### Cambio 4 (menor): Indicador visual
Marcar visualmente las evoluciones de otros profesionales como solo lectura para `health_pro`, mostrando el nombre del profesional autor.

## Archivos a modificar
1. `src/components/patients/ClinicalHistoryBlock.tsx` — corregir `canEdit`, recibir `currentPractitionerId`
2. `src/components/patients/ClinicalHistoryDialog.tsx` — pasar `currentPractitionerId` como prop
3. `src/hooks/usePatientClinicalNotes.ts` — (sin cambios)
4. `src/contexts/AppContext.tsx` — verificar que `currentPractitionerId` esté disponible en el estado (si no, agregarlo)

## Impacto
- Mirian y otros `health_pro` solo podrán editar sus propias evoluciones del día actual
- Las evoluciones de otros profesionales se mostrarán como solo lectura con indicador del autor
- Los errores de permisos darán feedback claro al usuario

