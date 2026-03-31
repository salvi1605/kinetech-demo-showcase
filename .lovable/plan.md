

## Fix: Cita con sub_slot=0 + protección futura

### Problema
Una cita (Patricia Pennisi, ID `750846ec-...`) tiene `sub_slot = 0`, que es invisible en el calendario (renderiza 1-5) pero cuenta para la validación de capacidad. Esto bloqueaba nuevas citas en ese horario.

### Cambios

#### 1. Corregir dato existente (INSERT tool — UPDATE)
- Actualizar la cita `750846ec-ae22-4db2-8133-66f1bd90d8c4` de `sub_slot = 0` → `sub_slot = 2` (el slot libre más bajo en ese bloque, ya que slot 1 está ocupado por Luciana).

#### 2. Migración SQL — CHECK constraint + validación en RPC
- Agregar `CHECK (sub_slot >= 1 AND sub_slot <= 10)` a la tabla `appointments`.
- Modificar `validate_and_create_appointment`: agregar validación temprana que rechace `p_sub_slot < 1` (retorna error `INVALID_SLOT`).
- Modificar `validate_and_update_appointment`: misma validación defensiva para `p_sub_slot`.

#### 3. Fix frontend — NewAppointmentDialog.tsx
- **Línea 220**: Cambiar `selectedSlot.subSlot ?? 1` → `(selectedSlot.subSlot ?? 0) + 1`
  - El calendario pasa índices 0-based; `??` no convierte `0` porque no es null/undefined.
  - Este patrón ya se usa correctamente en `MassCreateAppointmentDialog`.

### Archivos modificados
| Archivo | Cambio |
|---|---|
| Nueva migración SQL | CHECK constraint + DROP/recreate RPCs con validación |
| `src/components/dialogs/NewAppointmentDialog.tsx` | Línea 220: conversión 0→1 indexed |

### Resultado
- Patricia Pennisi aparece visible en slot 2
- Imposible crear citas con sub_slot < 1 (DB lo rechaza)
- RPCs validan defensivamente antes de procesar
- Frontend convierte correctamente de 0-indexed a 1-indexed

