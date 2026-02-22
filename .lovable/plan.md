

# Normalizar formato de fecha a DD/MM/YYYY en toda la aplicacion

## Problema

La fecha de nacimiento en Paciente > Ficha > Datos se muestra en formato YYYY-MM-DD (raw de la base de datos). Ademas, hay inconsistencias menores en otros puntos donde se usa `toLocaleDateString('es-ES')` que puede producir formatos variables segun el navegador.

## Hallazgos del analisis

### 1. Fecha de nacimiento en PatientDetailTabs (problema principal)

**Archivo**: `src/pages/PatientDetailTabs.tsx`, linea 468

El campo usa un `<Input>` generico que muestra el valor raw de la BD (`YYYY-MM-DD`):

```text
value={patient.identificacion?.dateOfBirth || patient.birthDate || ''}
```

No hay formateo. El componente `DateOfBirthInput` (que si formatea a DD/MM/YYYY) existe pero no se usa aqui.

**Solucion**: Formatear el valor para visualizacion usando `parseSmartDOB` + `formatDisplayDate` de `dateUtils.ts`. Cuando el campo esta en modo edicion, usar `DateOfBirthInput` o mantener el input formateado.

### 2. Fechas de citas con `toLocaleDateString('es-ES')`

Varios puntos usan `parseLocalDate(date).toLocaleDateString('es-ES')` que delega el formato al navegador (puede variar entre `22/2/2026` y `22/02/2026`). Mejor usar `formatDisplayDate` para consistencia estricta `DD/MM/YYYY`.

**Archivos afectados**:

- `src/pages/PatientDetailTabs.tsx` - lineas 371, 377, 408, 675 (ultima visita, proxima cita, listados de turnos)
- `src/pages/Patients.tsx` - lineas 244, 450, 456 (tabla y cards de pacientes)

**Solucion**: Reemplazar `parseLocalDate(x).toLocaleDateString('es-ES')` por `formatDisplayDate(parseLocalDate(x))` que produce siempre `DD/MM/YYYY`.

### 3. Fechas ya correctas (no requieren cambios)

- Excepciones (`Exceptions.tsx`): usa `format(date, 'dd MMM yyyy')` - formato legible correcto
- Dialogo de cita nueva (`NewAppointmentDialog.tsx`): usa `format(date, 'dd/MM/yyyy')` - correcto
- Dialogo de detalle (`AppointmentDetailDialog.tsx`): usa `format(date, 'dd/MM/yyyy')` - correcto
- Dialogo liberar (`FreeAppointmentDialog.tsx`): usa `format(date, 'EEE dd/MM')` - correcto
- `ClinicalHistoryDialog.tsx`: usa `formatDisplayDate(parseSmartDOB(...))` - correcto
- `DateOfBirthInput.tsx`: usa `formatDisplayDate` internamente - correcto

## Cambios necesarios

### Archivo 1: `src/pages/PatientDetailTabs.tsx`

6 cambios puntuales:

1. **Linea 468** - Campo fecha de nacimiento: formatear el valor con `parseSmartDOB` + `formatDisplayDate` para mostrar DD/MM/YYYY en vez del raw YYYY-MM-DD
2. **Linea 371** - Ultima visita: cambiar `toLocaleDateString('es-ES')` por `formatDisplayDate(parseLocalDate(...))`
3. **Linea 377** - Proxima cita: idem
4. **Linea 408** - Lista proximos turnos: idem
5. **Linea 675** - Historial de turnos: idem
6. Agregar import de `formatDisplayDate` desde `@/utils/dateUtils` (ya importa `parseLocalDate` de ahi)

### Archivo 2: `src/pages/Patients.tsx`

3 cambios puntuales:

1. **Linea 244** - Tabla ultima visita: cambiar `toLocaleDateString('es-ES')` por `formatDisplayDate(parseLocalDate(...))`
2. **Linea 450** - Card ultima visita: idem
3. **Linea 456** - Card proxima cita: idem
4. Agregar import de `formatDisplayDate` desde `@/utils/dateUtils`

## Impacto

- Solo afecta visualizacion, no modifica datos almacenados
- No cambia logica de comparacion de fechas (las comparaciones internas siguen usando YYYY-MM-DD)
- `parseSmartDOB` maneja ambos formatos (YYYY-MM-DD antiguo y DD-MM-YYYY nuevo), asi que es retrocompatible
- Resultado: todas las fechas visibles al usuario mostraran DD/MM/YYYY de forma consistente

