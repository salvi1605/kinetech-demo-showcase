
# Validar bloqueo de profesional al seleccionar slots (antes de confirmar)

## Problema

Cuando el usuario selecciona horarios en modo multi-seleccion y elige un profesional que esta de vacaciones (o tiene algun bloqueo), el sistema permite seleccionar los slots sin problema. Recien al presionar "Confirmar seleccion" y completar el formulario, se muestra el error de que el profesional no esta disponible.

El comportamiento esperado es: al intentar seleccionar un slot, si el profesional elegido (`selectedPractitionerId`) tiene un bloqueo (vacaciones, licencia, etc.) en esa fecha, mostrar el mensaje de advertencia inmediatamente y no permitir la seleccion.

## Causa raiz

En `onSubSlotClick` (Calendar.tsx, linea 394), la validacion de bloqueo usa `state.filterPractitionerId` (el filtro visual del calendario), no `state.selectedPractitionerId` (el profesional asignado para crear citas). Son dos campos distintos:

- `filterPractitionerId`: filtra que citas se muestran en la grilla
- `selectedPractitionerId`: el profesional al que se le asignaran las nuevas citas

El usuario puede tener el filtro en "Todos" y seleccionar un profesional especifico para las citas. En ese caso, la validacion de bloqueo no detecta la restriccion.

## Solucion

### Archivo: `src/pages/Calendar.tsx`

**Cambio 1 - En `onSubSlotClick` (linea ~426)**: Antes de ejecutar `toggleSelect(key)` en modo multi-seleccion, agregar una validacion que verifique si `state.selectedPractitionerId` tiene un bloqueo en la fecha del slot seleccionado usando `isSlotBlocked`.

```text
if (isMultiSelectEnabled) {
  // NUEVO: Verificar bloqueo del profesional seleccionado para creacion
  if (state.selectedPractitionerId) {
    const practitionerBlockCheck = isSlotBlocked(dateISO, meta.time, state.selectedPractitionerId);
    if (practitionerBlockCheck.blocked) {
      toast({
        title: "Profesional no disponible",
        description: practitionerBlockCheck.reason || 'El profesional tiene un bloqueo en este horario',
        variant: "destructive",
      });
      return;
    }
  }
  toggleSelect(key);
}
```

**Cambio 2 - En la validacion existente (linea ~394)**: Extender la validacion de `isSlotBlocked` para que tambien considere `state.selectedPractitionerId` ademas de `state.filterPractitionerId`, para cubrir el caso del click individual (no multi-select).

La validacion actual:
```text
const blockCheck = isSlotBlocked(dateISO, meta.time, state.filterPractitionerId || undefined);
```

Se complementa con una segunda verificacion para el profesional de creacion si es distinto del filtro.

### Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/pages/Calendar.tsx` | Agregar validacion de bloqueo contra `selectedPractitionerId` en `onSubSlotClick`, tanto para multi-select como para click individual |

### Impacto

- Solo afecta la logica de seleccion en el calendario
- No modifica la base de datos ni las validaciones del dialogo de confirmacion (que se mantienen como segunda barrera)
- La validacion usa el mismo hook `isSlotBlocked` (de `useScheduleExceptions`) que ya esta cargado
