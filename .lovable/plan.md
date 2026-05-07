## Problema 1: Horario copiado distinto al de la cita

**Estado: ✅ YA SOLUCIONADO** (no hay nada que hacer ahora).

**Qué pasaba:** Cuando se copiaba un turno desde el sistema para mandarlo por WhatsApp, a veces aparecía la hora con segundos (ej. `09:30:00`) o se leía mal. En el caso real de Marianela / Rodríguez Laila, el mensaje copiado no coincidía con la hora real de la cita, generando confusión con la paciente.

**Por qué pasaba:** La base de datos guarda la hora como `09:30:00`. En algunos lugares del código se interpolaba ese valor crudo en el texto a copiar, sin recortar los segundos ni normalizar el formato.

**Qué se hizo:**
- Se centralizó el formato en `src/utils/copyFormat.ts` con una función `normalizeTime` que **siempre** convierte cualquier hora a `HH:mm` (24h, sin segundos), sin importar cómo venga.
- Se dejó como **regla del proyecto** (memoria `clipboard-time-format-rule`) que ningún texto destinado al paciente puede usar la hora cruda de la base — siempre tiene que pasar por `formatCopyLine` o normalizarse con `.slice(0,5)`.
- Todos los lugares donde se copia un resumen de turno fueron auditados y migrados a esta helper.

**Por qué ya no vuelve a pasar:** Aunque la base devuelva la hora con segundos o en otro formato, la función la fuerza siempre a `HH:mm`. La hora copiada **es exactamente la misma** que la guardada en la cita.

---

## Problema 2: Badge "N" (primera cita) desaparece si el paciente faltó o reagendó

**Estado: ❌ NO solucionado todavía. Plan abajo.**

**Qué pasa hoy:** El badge "N" (paciente nuevo / primera vez) se muestra en la cita cuya fecha coincide con la fecha más temprana del paciente en el sistema. Hoy el cálculo (`useFirstVisitPatients`) excluye solo las citas **canceladas**, pero **sí cuenta** las citas marcadas como `no_show` (no asistió).

**Resultado:** Si la primera cita del paciente fue `no_show`, el sistema sigue considerando esa fecha pasada como "la primera visita" y la siguiente cita real (la que sí va a atender) **no** muestra el badge N. El kinesiólogo entonces no sabe que es la primera vez que ve a esa persona.

### Plan de acción

**Cambio principal — lógica del hook `useFirstVisitPatients`:**

Redefinir "primera visita" como: la **primera cita que el paciente realmente va a atender o atendió**. Esto significa excluir del cálculo:
- `cancelled` (ya se excluye)
- `no_show` (NUEVO — agregar)

Citas válidas para marcar como "primera": `scheduled` y `completed`.

Así, si la cita del lunes fue `no_show`, la del jueves siguiente (status `scheduled`) pasa a ser la "primera visita" y muestra el badge N automáticamente. Si después esa también se marca no-show, el badge salta a la siguiente. Y así sucesivamente.

**Casos cubiertos con este cambio:**
- Paciente nuevo, primera cita `scheduled` → badge N en esa cita ✅
- Paciente faltó a la primera (`no_show`) y tiene otra agendada → badge N salta a la nueva ✅
- Paciente reagendó: la cita vieja queda como `cancelled` o `no_show`, la nueva toma el badge ✅
- Paciente que ya tuvo una cita `completed` → nunca más muestra badge N ✅

**Detalle técnico:** un solo cambio en `src/hooks/useFirstVisitPatients.ts`, línea 33: cambiar `.neq('status', 'cancelled')` por `.in('status', ['scheduled', 'completed'])`. El resto de la lógica (calcular el mínimo y filtrar a la semana visible) queda igual.

**Validación:**
1. Marcar la primera cita de un paciente como `no_show` → la siguiente cita del mismo paciente debe mostrar el badge N en el calendario.
2. Reagendar la primera cita de un paciente → la nueva cita debe mostrar el badge N.
3. Paciente con una cita `completed` previa → ninguna cita futura muestra N (no es nuevo).
4. Paciente realmente nuevo con una sola cita `scheduled` → muestra N (no debe romperse el caso normal).
