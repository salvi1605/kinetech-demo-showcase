
# Diagnostico: Advertencia de vacaciones afectando profesionales incorrectos

## Hallazgos en la base de datos

Las vacaciones de Telma estan correctamente almacenadas como `practitioner_block` con su `practitioner_id` especifico. No hay error en los datos.

## Causa raiz: indicadores visuales con scope global

El problema esta en `Calendar.tsx`, lineas 901-941, donde se renderizan los encabezados de cada dia de la semana.

### Defecto 1: Header del dia muestra alerta para CUALQUIER bloqueo profesional (linea 905)

```text
const hasBlock = dayExceptions.some(e => e.type === 'practitioner_block');
```

Este codigo verifica si existe ALGUN `practitioner_block` para ese dia, sin importar a que profesional pertenece. Cuando Telma tiene vacaciones:

- Todos los dias de su periodo vacacional muestran fondo ambar y un icono de alerta (triangulo amarillo)
- Esto ocurre incluso si el usuario esta filtrando por Miriam o Victoria
- Visualmente, parece que el dia esta restringido para todos

### Defecto 2: Tooltip muestra TODAS las excepciones sin filtrar (lineas 932-937)

```text
{dayExceptions.map((e, i) => (
  <p key={i}>... {e.reason || TYPE_LABELS_CAL[e.type]} ...</p>
))}
```

Al pasar el mouse sobre el encabezado del dia, el tooltip lista TODAS las excepciones, incluyendo "VACACIONES" de Telma, sin indicar a que profesional pertenece cada una. El usuario ve "VACACIONES" y asume que aplica a todos.

### Defecto 3: No se filtra por profesional seleccionado

Cuando el usuario tiene activo un filtro de profesional (ej: solo Miriam), el header deberia mostrar unicamente las excepciones relevantes para Miriam, ignorando las de Telma. Actualmente muestra todas.

## Logica de bloqueo funcional (NO es la causa)

La funcion `isBlocked` en `useScheduleExceptions.ts` SI filtra correctamente por `practitionerId`. Los clicks en slots vacios NO estan bloqueados para Miriam/Victoria cuando Telma esta de vacaciones. El problema es exclusivamente visual/informativo.

## Flujo del problema

```text
Usuario navega a semana con vacaciones de Telma
  |
  v
Calendar.tsx renderiza headers de dias
  |
  v
hasBlock = dayExceptions.some(e => e.type === 'practitioner_block')
  --> true (porque Telma tiene practitioner_block)
  |
  v
Header muestra fondo ambar + icono AlertTriangle para TODOS los dias
  |
  v
Tooltip muestra "VACACIONES" sin indicar que es solo de Telma
  |
  v
Usuario interpreta que el dia esta restringido para todos los profesionales
```

## Plan de correccion

### Archivo: `src/pages/Calendar.tsx` (lineas 901-941)

**Cambio A**: Filtrar excepciones por profesional activo

Cuando `state.filterPractitionerId` esta activo, filtrar `dayExceptions` para mostrar solo las relevantes:
- Excepciones de tipo `clinic_closed` y holidays (afectan a todos, siempre se muestran)
- Excepciones de tipo `practitioner_block` solo si `practitionerId` coincide con el filtro activo

Cuando no hay filtro activo (vista "Todos los profesionales"), mostrar todas pero con contexto.

**Cambio B**: Agregar nombre del profesional al tooltip

Modificar el tooltip (lineas 932-937) para incluir el nombre del profesional afectado en cada excepcion de tipo `practitioner_block`:

Antes: `"VACACIONES"`
Despues: `"Telma Ayastuy: VACACIONES"`

**Cambio C**: Diferenciar visualmente bloqueos individuales vs globales

- `clinic_closed` / holidays: fondo rojo (sin cambios)
- `practitioner_block` cuando hay filtro activo y NO coincide: sin indicador (dia normal)
- `practitioner_block` cuando hay filtro activo y SI coincide: fondo ambar con alerta
- `practitioner_block` cuando no hay filtro: fondo ambar suave con texto informativo en tooltip indicando que profesionales estan bloqueados

### Detalle de implementacion

En la seccion del header (lineas 901-941):

1. Crear una variable `relevantExceptions` que filtre `dayExceptions` segun `state.filterPractitionerId`
2. Recalcular `isClosed` y `hasBlock` usando `relevantExceptions` en lugar de `dayExceptions`
3. En el tooltip, usar `dayExceptions` completo pero con el nombre del profesional para cada `practitioner_block`
4. Agregar el `practitionerName` que ya existe en la interfaz `ExceptionInfo` del hook `useScheduleExceptions`
