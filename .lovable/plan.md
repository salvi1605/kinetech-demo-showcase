

# Fix: RescheduleSlotPicker trata bloqueos parciales como bloqueo total del día

## Problema
Línea 62: la query a `schedule_exceptions` no pide `from_time` ni `to_time`.
Líneas 77-84: cualquier `practitioner_block` dispara `setIsDayBlocked(true)` y corta el render completo, sin distinguir si es bloqueo parcial (con horario) o total (sin horario).

## Cambios — archivo único: `src/components/shared/RescheduleSlotPicker.tsx`

### 1. Agregar `from_time, to_time` al select de excepciones
Línea 62: cambiar `.select('type, reason, practitioner_id')` → `.select('type, reason, practitioner_id, from_time, to_time')`

### 2. Separar bloqueos totales de parciales
Reemplazar la lógica de líneas 77-85:
- **Bloqueo total del día**: `clinic_closed` O `practitioner_block` SIN `from_time`/`to_time` → mantener `setIsDayBlocked(true)` + return (comportamiento actual).
- **Bloqueos parciales**: `practitioner_block` CON `from_time` y `to_time` → recolectar en un array `partialBlocks` (ej: `[{from: "08:00", to: "12:00"}]`).

### 3. Marcar slots bloqueados parcialmente
Después de construir `slotInfos` (línea ~108), recorrer cada slot y verificar si su hora cae dentro de algún `partialBlock`. Si cae, marcar todos los sub-slots de ese bloque como "bloqueados" (nuevo campo `isBlocked: true` en la interfaz de sub-slot).

### 4. Render de slots bloqueados parcialmente
En el JSX, los sub-slots con `isBlocked && !isCurrent` se renderizan como un `<div>` no clickeable con texto "Bloqueado" (mismo estilo que "Ocupado" pero con color diferente, ej. `bg-red-100 text-red-600`).

### 5. Mensaje de orientación
Cuando `isDayBlocked` es true (bloqueo total), agregar debajo del mensaje actual: "Podés seleccionar otro profesional para ver su disponibilidad".

---

**Resultado**: bloqueos parciales solo ocultan los slots afectados; el resto del día queda disponible para reprogramar. Bloqueos totales mantienen el comportamiento actual con mejor guía al usuario.

