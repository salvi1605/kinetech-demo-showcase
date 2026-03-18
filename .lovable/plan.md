

# Fix: Ambigüedad de funciones `validate_and_update_appointment`

## Problema

La migración que agregó soporte para `extended_hours` (20260318) creó la función `validate_and_update_appointment` con los parámetros en un orden diferente al de la versión existente (20260310):

```text
Versión existente (20260310):  ..., p_sub_slot, p_status, p_treatment_type_key, p_notes
Versión nueva (20260318):      ..., p_status, p_treatment_type_key, p_notes, p_sub_slot
```

`CREATE OR REPLACE` no reemplazó la existente porque la firma es diferente — creó una **segunda función**. PostgreSQL no puede elegir cuál usar y devuelve `PGRST203`.

## Solución

Una migración SQL que:
1. `DROP FUNCTION` de ambas firmas
2. `CREATE FUNCTION` con la firma correcta (la del 20260310: `p_sub_slot` antes de `p_status`) que incluye la lógica de `extended_hours`

La firma correcta a mantener es la de 20260310 porque es la que el frontend ya invoca con el orden `p_sub_slot, p_status, ...`.

## Archivo

| Accion | Archivo |
|---|---|
| Nueva migración SQL | Drop ambas + recrear con extended_hours |

No hay cambios de frontend. Solo se corrige la ambigüedad en la base de datos.

