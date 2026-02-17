

# Correccion del checkbox de estado + Reestructuracion de nombres de pacientes

## Problema 1: Checkbox de estado no aparece para Marianela

### Diagnostico

En `Calendar.tsx`, linea 506, el codigo verifica permisos asi:

```text
const hasPermission = ['admin', 'tenant_owner', 'recep', 'kinesio'].includes(state.userRole);
```

Pero los roles reales en la base de datos son: `admin_clinic`, `tenant_owner`, `receptionist`, `health_pro`. El rol de Marianela es `admin_clinic`, que no coincide con `'admin'` en la lista. Por eso el checkbox nunca se muestra para ella (ni para ningun usuario).

El mismo error esta en la linea 1002 (vista mobile).

### Solucion

Corregir las dos lineas para usar los IDs de rol correctos:

```text
const hasPermission = ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'].includes(state.userRole);
```

**Archivos a modificar:** `src/pages/Calendar.tsx` (lineas 506 y 1002)

---

## Problema 2: Nombres de pacientes muy largos en el calendario

### Diagnostico

Los 160 pacientes actuales usan un unico campo `full_name` con formato libre (ej: "ALVAREZ ARROYO LEILANY CAROLINA"). En el calendario se muestran truncados y no hay forma de controlar que parte del nombre se ve.

### Solucion en 3 partes

#### Parte A: Agregar columnas estructuradas a la tabla `patients`

Nuevas columnas (todas opcionales para no romper inserts existentes):
- `first_surname` (text, nullable) -- Primer apellido
- `second_surname` (text, nullable) -- Segundo apellido
- `first_name` (text, nullable) -- Primer nombre
- `second_name` (text, nullable) -- Segundo nombre

Se mantiene `full_name` como campo existente y se sigue usando como fallback.

#### Parte B: Migracion automatica de datos existentes

Se ejecutara un UPDATE SQL que parsea `full_name` usando la logica mas comun en los datos (APELLIDO1 [APELLIDO2] NOMBRE1 [NOMBRE2]):

- Si tiene 2 palabras: primera = apellido1, segunda = nombre1
- Si tiene 3 palabras: primera = apellido1, segunda y tercera = nombre1 nombre2 (o apellido2 + nombre1)
- Si tiene 4+ palabras: primera = apellido1, segunda = apellido2, tercera = nombre1, cuarta = nombre2

Dado que el parseo automatico puede no ser 100% exacto en todos los casos (especialmente con 3 palabras), se proporciona una forma de corregir manualmente en el formulario de edicion de paciente.

#### Parte C: Mostrar nombre corto en el calendario

Crear una funcion helper `formatPatientShortName()` que genere un nombre compacto para el calendario:

```text
Formato: "Apellido1 I. Nombre1"
Ejemplos:
  ALVAREZ ARROYO LEILANY CAROLINA -> "Alvarez A. Leilany"
  BELLO PEDRO -> "Bello Pedro"
  ALBANO MARIA LUZ -> "Albano Maria"
```

Si los campos estructurados no estan llenos, se usa `full_name` truncado como fallback.

#### Parte D: Actualizar formularios de paciente

Los formularios de creacion y edicion de pacientes mostraran los 4 campos separados (primer apellido, segundo apellido, primer nombre, segundo nombre) y auto-generaran `full_name` concatenandolos.

---

## Detalle tecnico

### Archivos a modificar

1. **`src/pages/Calendar.tsx`**
   - Linea 506: corregir array de roles en hasPermission (desktop)
   - Linea 1002: corregir array de roles en hasPermission (mobile)
   - Usar `formatPatientShortName()` en lugar de `patient?.name` en la vista del calendario

2. **Migracion SQL** (nueva)
   - ALTER TABLE patients ADD COLUMN first_surname, second_surname, first_name, second_name
   - UPDATE patients SET campos parsados desde full_name

3. **`src/utils/formatters.ts`** (nuevo helper)
   - Funcion `formatPatientShortName(patient)` que retorna el nombre compacto

4. **`src/components/patients/NewPatientDialogV2.tsx`**
   - Agregar los 4 campos de nombre separados
   - Auto-generar full_name al guardar

5. **`src/components/patients/EditPatientDialogV2.tsx`**
   - Agregar los 4 campos de nombre separados
   - Auto-generar full_name al guardar

6. **`src/hooks/useAppointmentsForClinic.ts`**
   - Incluir los nuevos campos en la query de pacientes

7. **`src/hooks/usePatients.ts`**
   - Incluir los nuevos campos en la query

### Migracion SQL propuesta

```text
-- Agregar columnas estructuradas
ALTER TABLE patients ADD COLUMN first_surname text;
ALTER TABLE patients ADD COLUMN second_surname text;
ALTER TABLE patients ADD COLUMN first_name text;
ALTER TABLE patients ADD COLUMN second_name text;

-- Parsear nombres existentes (4 palabras: AP1 AP2 NOM1 NOM2)
UPDATE patients
SET
  first_surname  = split_part(full_name, ' ', 1),
  second_surname = CASE WHEN array_length(string_to_array(full_name, ' '), 1) >= 4
                        THEN split_part(full_name, ' ', 2) ELSE NULL END,
  first_name     = CASE
    WHEN array_length(string_to_array(full_name, ' '), 1) >= 4 THEN split_part(full_name, ' ', 3)
    WHEN array_length(string_to_array(full_name, ' '), 1) = 3 THEN split_part(full_name, ' ', 2)
    WHEN array_length(string_to_array(full_name, ' '), 1) = 2 THEN split_part(full_name, ' ', 2)
    ELSE NULL END,
  second_name    = CASE
    WHEN array_length(string_to_array(full_name, ' '), 1) >= 4 THEN split_part(full_name, ' ', 4)
    WHEN array_length(string_to_array(full_name, ' '), 1) = 3 THEN split_part(full_name, ' ', 3)
    ELSE NULL END
WHERE first_surname IS NULL;
```

### Formato corto en calendario

```text
function formatPatientShortName(patient):
  Si tiene first_surname y first_name:
    nombre = capitalize(first_surname)
    Si tiene second_surname: nombre += " " + inicial(second_surname) + "."
    nombre += " " + capitalize(first_name)
    return nombre
  Sino:
    return full_name (truncado a ~25 chars)
```

### Resultado esperado

- El checkbox de tri-estado (Reservado/Asistio/No Asistio) aparecera correctamente para todos los roles
- Los nombres en el calendario se mostraran compactos: "Alvarez A. Leilany" en lugar de "ALVAREZ ARROYO LEILANY CAROLINA"
- Los 160 pacientes existentes se migraran automaticamente
- Los formularios permitiran corregir manualmente cualquier nombre mal parseado

