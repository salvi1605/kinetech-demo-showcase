

# Plan: Corregir fuente de datos de `isBlockedByExclusive`

## Problema actual
La funcion `isBlockedByExclusive` usa `allAppointmentsBySlotKey` (mapa global con TODAS las citas) y luego filtra manualmente por `filterPractitionerId`. Esto es redundante e inconsistente con el resto del calendario que ya usa `appointmentsBySlotKey` (mapa filtrado).

## Cambio unico

**Archivo:** `src/pages/Calendar.tsx`, lineas 325-346

Reemplazar el cuerpo de `isBlockedByExclusive` para que:
1. Use `appointmentsBySlotKey` (ya filtrado por profesional activo y busqueda de paciente) en lugar de `allAppointmentsBySlotKey`
2. Elimine el bloque `if (state.filterPractitionerId && apt.practitionerId !== state.filterPractitionerId) continue;` ya que el mapa filtrado lo hace innecesario
3. Actualice las dependencias del `useCallback` para quitar `allAppointmentsBySlotKey` y `state.filterPractitionerId`, y poner `appointmentsBySlotKey`

```text
// ANTES (simplificado)
const apt = allAppointmentsBySlotKey.get(key);
if (apt && exclusive && !cancelled) {
  if (filterPractitioner && apt.practitioner !== filter) continue;
  return true;
}

// DESPUES
const apt = appointmentsBySlotKey.get(key);
if (apt && exclusive && !cancelled) {
  return true;
}
```

## Criterios de aceptacion

- Con Dr. A seleccionado: un exclusivo en 10:00 muestra candado en ese bloque
- Cambias a Dr. B: NO aparece candado por el exclusivo de Dr. A
- Cancelas la cita exclusiva de Dr. A y vuelves a su filtro: el candado desaparece via realtime sin refresh

## Complejidad
Minima: solo se cambia la referencia de un mapa y se eliminan 3 lineas de codigo.

