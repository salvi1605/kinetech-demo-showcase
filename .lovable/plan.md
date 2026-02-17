

# Uso consistente de nombres estructurados en toda la app

## Situacion actual

La funcion `formatPatientShortName()` solo se usa en el calendario (2 lugares). El resto de la app sigue usando `patient.name` (que es `full_name` sin estructura). Hay **6 archivos adicionales** que necesitan actualizarse para usar los nombres estructurados de forma coherente.

---

## Cambios por archivo

### 1. `src/utils/formatters.ts` - Agregar helper para nombre completo formateado

Crear una segunda funcion `formatPatientFullName()` que capitalice correctamente los campos estructurados para vistas donde se necesita el nombre completo (no el corto del calendario):

```text
formatPatientFullName(patient) -> "Alvarez Arroyo Leilany Carolina"
(capitalizado, desde campos estructurados, con fallback a patient.name)
```

### 2. `src/pages/Patients.tsx` - Lista de pacientes

- Linea 50: busqueda - agregar busqueda en campos estructurados ademas de `patient.name`
- Lineas 198, 202, 369, 373: reemplazar `patient.name` por `formatPatientFullName(patient)`
- Lineas 198, 369 (initials): usar `getInitials(formatPatientFullName(patient))`

### 3. `src/pages/PatientDetailTabs.tsx` - Detalle de paciente

- Linea 285, 289: reemplazar `patient.name` por `formatPatientFullName(patient)`
- Linea 203, 441: actualizar para usar campos estructurados en lugar de `patient.name`

### 4. `src/components/dialogs/AppointmentDetailDialog.tsx` - Detalle de turno

- Linea 203: copiar resumen - usar `formatPatientFullName(patient)` en vez de `patient?.name`
- Linea 239: toast de eliminacion - usar `formatPatientFullName(patient)`

### 5. `src/components/dialogs/NewAppointmentDialog.tsx` - Nuevo turno

- Linea 95: busqueda de pacientes - agregar busqueda en campos estructurados
- Linea 147: toast - usar `formatPatientFullName`
- Lineas 453, 456: lista de resultados de busqueda - usar `formatPatientShortName` para mostrar

### 6. `src/components/dialogs/MassCreateAppointmentDialog.tsx` - Creacion masiva

- Linea 72: busqueda - agregar campos estructurados
- Lineas 523, 528: lista de resultados - usar `formatPatientShortName`

### 7. `src/components/patients/ClinicalHistoryDialog.tsx` - Historial clinico

- Linea 133: titulo del dialog - usar `formatPatientFullName(patient)`

### 8. `src/components/layout/Breadcrumbs.tsx` - Migas de pan

- Linea 40: usar `formatPatientShortName(patient)` para breadcrumbs mas compactos

### 9. `src/pages/Calendar.tsx` - Busqueda de pacientes

- Linea 179: el filtro de busqueda usa `patient?.name` - agregar busqueda en campos estructurados tambien

---

## Detalle tecnico

### Nueva funcion en formatters.ts

```text
formatPatientFullName(patient):
  Si tiene first_surname y first_name:
    resultado = capitalize(first_surname)
    Si tiene second_surname: resultado += " " + capitalize(second_surname)
    resultado += " " + capitalize(first_name)
    Si tiene second_name: resultado += " " + capitalize(second_name)
    return resultado
  Sino:
    return capitalize cada palabra de (patient.name || patient.full_name || "Paciente")
```

### Busqueda mejorada

En todos los filtros de busqueda, se buscara en:
- `patient.name` (fallback, full_name original)
- `patient.first_surname`
- `patient.second_surname`
- `patient.first_name`
- `patient.second_name`

Esto permite buscar por cualquier parte del nombre estructurado.

### Resumen de funciones y donde usarlas

| Funcion | Donde usarla |
|---------|-------------|
| `formatPatientShortName` | Calendario, breadcrumbs, listas de busqueda en dialogs |
| `formatPatientFullName` | Detalle de paciente, lista de pacientes, toasts, copiar resumen, historial clinico |

