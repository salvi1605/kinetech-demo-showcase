

# Diagnóstico: Evolución faltante para Zion Pablo (5 de marzo)

## Es un error diferente al de Recepter G.

El problema de Recepter fue sobre texto copiado al portapapeles que no reflejaba un cambio posterior. Este problema de Zion Pablo es distinto: **el cuadro de evolución para la cita del 5 de marzo simplemente no existía cuando Victoria abrió el historial ese día.**

## Causa raíz

Las citas de Zion Pablo fueron creadas en lote (batch) el **9 de febrero**, antes de que se implementara la automatización que crea stubs de evolución al agendar. Por lo tanto, la cita del 5 de marzo no tenía un registro de evolución asociado en la base de datos.

El sistema tiene un **mecanismo de fallback** en el frontend (`usePatientClinicalNotes`) que detecta citas sin evolución y las crea automáticamente. Sin embargo, este fallback **falló silenciosamente** el 5 de marzo — probablemente por un error de permisos o un conflicto al intentar insertar varias filas simultáneamente. El código captura el error con `console.error` pero continúa mostrando solo los datos que ya existían (la evolución del 2 de marzo).

Los stubs faltantes se crearon recién hoy (6 de marzo a las 11:53) cuando alguien volvió a abrir el historial y el fallback finalmente funcionó.

## Evidencia en la base de datos

| Cita | Fecha | Creada (appointment) | Stub evolución creado |
|---|---|---|---|
| 2 marzo (individual) | 02/03 | 02/03 17:56 | 02/03 17:56 (automático por RPC) |
| 5 marzo (batch) | 05/03 | 09/02 17:24 | **06/03 11:53** (fallback tardío) |
| 9, 12, 16, 19, 25 marzo | varias | 09/02 17:24 | **06/03 11:53** (todos juntos) |

## Plan de solución

### 1. Crear un trigger de base de datos que genere stubs automáticamente

En lugar de depender del fallback del frontend (que puede fallar silenciosamente), agregar un **trigger SQL** en la tabla `appointments` que cree el stub de evolución al insertar una cita, independientemente de si fue creada por RPC individual, batch, o cualquier otro método. Esto garantiza que ninguna cita quede sin su evolución.

```text
appointments INSERT → trigger → INSERT patient_clinical_notes (evolution stub)
```

### 2. Mejorar el manejo de errores del fallback

Actualmente, si el fallback falla, el usuario no ve ninguna indicación. Agregar un toast de advertencia cuando el fallback detecta citas sin evolución y no puede crearlas, para que el usuario sepa que hay un problema y pueda reportarlo.

### 3. Mantener el fallback como red de seguridad

El fallback seguirá existiendo para citas históricas que no tengan stub, pero ya no será el mecanismo principal.

## Resumen de cambios

| Componente | Cambio |
|---|---|
| Migración SQL | Crear trigger `after insert` en `appointments` que inserte stub en `patient_clinical_notes` |
| `usePatientClinicalNotes.ts` | Agregar toast de advertencia si el fallback falla |

