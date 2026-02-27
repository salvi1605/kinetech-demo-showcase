
# Completar Pagina de Disponibilidad

## Objetivo
Reemplazar el placeholder actual de `/availability` con una pagina funcional que muestre todos los profesionales de la clinica con sus franjas horarias semanales, permitiendo ver y editar la disponibilidad de cada uno desde un solo lugar.

## Diseno de la solucion

La pagina mostrara una lista de profesionales como acordeones (Accordion). Cada acordeon muestra el nombre del profesional con un resumen de sus dias activos. Al expandir, se muestra el `AvailabilityEditor` ya existente, con un boton "Guardar" por profesional.

### Vista general
```text
+-----------------------------------------------+
| Disponibilidad                                 |
| Gestiona los horarios de disponibilidad...     |
+-----------------------------------------------+
| [Profesional A - color dot]                    |
|   Lun, Mar, Mie, Jue, Vie                     |
|   v (expandir)                                 |
|   +-------------------------------------------+
|   | [AvailabilityEditor existente]             |
|   | [Guardar cambios]                          |
|   +-------------------------------------------+
+-----------------------------------------------+
| [Profesional B - color dot]                    |
|   Sin horarios configurados                    |
+-----------------------------------------------+
```

## Cambios necesarios

### 1. Archivo: `src/pages/Availability.tsx` (reescribir completo)
- Importar `usePractitioners` para obtener los profesionales de la clinica actual
- Importar `AvailabilityEditor` y sus tipos
- Cargar la disponibilidad de todos los profesionales en un solo query a `practitioner_availability` filtrado por `clinic_id`
- Reutilizar la funcion `dbAvailabilityToEditor` (extraerla o copiarla)
- Mostrar cada profesional en un `Accordion` de shadcn/ui
- Dentro de cada accordion: el `AvailabilityEditor` con estado local
- Boton "Guardar" por profesional que hace delete + insert (mismo patron que `EditProfessionalDialog`)
- Toast de confirmacion/error
- Estado vacio cuando no hay profesionales
- Skeleton de carga

### 2. Reutilizacion de helpers
- Extraer `dbAvailabilityToEditor` y `dayKeyToNumber` como funciones exportadas desde un nuevo archivo `src/utils/availabilityHelpers.ts` para evitar duplicacion de codigo entre la pagina de disponibilidad y `EditProfessionalDialog`

## Detalles tecnicos

- **Datos**: Un solo `SELECT` de `practitioner_availability` filtrado por `clinic_id`, agrupado en frontend por `practitioner_id`
- **Guardado**: Por profesional, patron delete-all + insert-new (ya probado en `EditProfessionalDialog`)
- **Permisos**: Solo `admin_clinic` puede modificar (ya cubierto por RLS existente). Recepcionistas y profesionales pueden ver (SELECT policy existente)
- **RoleGuard**: El boton guardar solo se muestra a admin (usando `useApp` para verificar rol)
- **Responsive**: Accordion funciona bien en movil, `AvailabilityEditor` ya tiene layout responsive con los TimePickers
- **No se crean tablas ni migraciones**: se usa la tabla existente `practitioner_availability`
