

# Plan: Campos de nombre estructurados en pestaña Datos

## Problema
La pestaña "Datos" de la ficha del paciente muestra un solo campo "Nombre Completo" en vez de los 4 campos estructurados que ya se usan en los dialogs de crear/editar paciente.

## Cambio

### Archivo: `src/pages/PatientDetailTabs.tsx`

**1. Reemplazar el campo "Nombre Completo" (lineas 466-473) por 4 campos:**
- Primer Apellido (`first_surname`)
- Segundo Apellido (`second_surname`)
- Primer Nombre (`first_name`)
- Segundo Nombre (`second_name`)

Cada campo usa `handleFieldUpdate` para actualizar el campo directo del paciente (no dentro de `identificacion`), ya que los campos `first_surname`, `second_surname`, `first_name`, `second_name` son columnas directas en la tabla `patients`.

**2. Actualizar `handleSave` (lineas 208-255) para persistir los 4 campos estructurados:**
Agregar al objeto de update:
```
first_surname: patient.first_surname || null,
second_surname: patient.second_surname || null,
first_name: patient.first_name || null,
second_name: patient.second_name || null,
```
Y recalcular `full_name` a partir de los 4 campos al guardar.

## Resultado
- La pestaña Datos mostrara los 4 campos individuales, consistente con los dialogos de crear/editar
- Al editar, cada campo se modifica independientemente
- Al guardar, se persisten los 4 campos y se recalcula `full_name`

