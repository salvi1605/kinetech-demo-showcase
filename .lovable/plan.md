

# Plan: Mostrar slots ocupados por otro paciente como bloqueados (gris + X)

## Objetivo

Cuando hay un filtro de paciente activo en el calendario, los sub-slots que tienen citas de **otros pacientes** deben mostrarse como bloqueados (fondo gris, icono X, no clickeables), igual que ya se hace con el filtro de profesional.

## Cambios

### Archivo: `src/pages/Calendar.tsx`

**1. Nueva funcion `isOccupiedByOtherPatient`** (junto a `isOccupiedByOtherPractitioner`, linea ~247)

Misma logica que `isOccupiedByOtherPractitioner` pero para pacientes:
- Si no hay `filterPatientSearch` activo, retorna `false`
- Si el slot tiene una cita en `allAppointmentsBySlotKey` cuyo paciente NO coincide con la busqueda, retorna `true`

**2. Actualizar las 3 zonas de renderizado de sub-slots vacios** (desktop grid compact ~linea 658, desktop grid expanded ~linea 720, mobile ~linea 1175)

En cada una, despues del check `isOccupiedByOtherPractitioner(key)`, agregar un check `isOccupiedByOtherPatient(key)` que renderice el mismo componente gris con X y tooltip "Ocupado por otro paciente" / nombre del paciente que ocupa el slot.

**3. Actualizar `onSubSlotClick`** (~linea 448)

Agregar validacion: si `isOccupiedByOtherPatient(key)`, mostrar toast "Slot ocupado por otro paciente" y retornar sin hacer nada.

## Detalle tecnico

```text
isOccupiedByOtherPatient(key):
  1. Si no hay filterPatientSearch -> false
  2. Buscar cita en allAppointmentsBySlotKey con esa key
  3. Si no hay cita -> false
  4. Buscar paciente de esa cita
  5. Si el nombre del paciente NO coincide con filterPatientSearch -> true (bloqueado)
  6. Si coincide -> false (es del paciente filtrado, se muestra normal)
```

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/pages/Calendar.tsx` | Nueva funcion + 3 bloques de render + validacion en click handler |

## Resultado

- Con filtro de paciente activo: slots de otros pacientes se ven grises con X (no seleccionables)
- Sin filtro de paciente: comportamiento identico al actual
- El patron replica exactamente lo que ya existe para el filtro de profesional

