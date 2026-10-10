# Agenda compacta (1–2 sub-turnos) — "Clínica Demo (Ventas)"

## Respuesta a la pregunta 1 (diagnóstico)
- La agenda semanal **no usa el ajuste de la clínica ni el sub-turno más alto cargado**. Dibuja siempre **5 filas fijas** por bloque de 30 min, porque el 5 está escrito en el código de la agenda (vista semanal y vista por día).
- El ajuste de la clínica "sub-turnos por bloque" (hoy 5) existe, pero solo lo usan el selector de sub-turno al crear un turno y la grilla de reprogramación. No cambia la altura de la agenda.
- Problema adicional: los turnos con sub-turno 6, 7 u 8 **no aparecen en la agenda**, porque solo se dibujan las filas 1 a 5. Hoy hay turnos de este tipo en esta clínica, así que la demo muestra menos turnos de los que tiene.
- Conclusión: solo con cambiar los datos y el ajuste a 2, cada bloque **seguiría ocupando 5 filas**, con 3 vacías. Para que se vea compacta hay que hacer también un cambio chico en la agenda.

## Qué propongo
1. **Datos (solo este tenant, una transacción):**
   - Paso todos los turnos activos a sub-turno 1 o 2. Si hay choque (misma fecha, hora y sub-turno), el turno pasa al primer horario libre del mismo día dentro de la disponibilidad de su profesional, y si no hay lugar, a un día cercano de la misma semana. Uso la misma regla para los turnos pasados, así el historial queda coherente.
   - También respeto el límite por tratamiento en cada bloque (máximo 2 para FKT/ATM/Vestibular/Otro, 1 para masaje y drenajes).
   - Los turnos cancelados no ocupan lugar: solo bajo su sub-turno a 1–2 cuando está libre. Si no, los dejo como están.
2. **Ajuste de la clínica:** "sub-turnos por bloque" de 5 → 2 (solo Clínica Demo (Ventas)).
3. **Agenda (cambio de código, afecta a todas las clínicas de forma segura):** la cantidad de filas por bloque pasa a ser el ajuste de la clínica (con 5 como valor por defecto, que es el que tienen hoy las demás clínicas: para ellas no cambia nada). Así Ventas se ve con 2 filas por bloque. No se publica.

## Verificación
- Cero choques de fecha + hora + sub-turno entre turnos activos.
- Semana 19–23/10 con 73 turnos. Total del tenant sin cambios (160), y conteo por estado igual.
- Todos los turnos dentro del horario de su profesional.
- Las demás clínicas siguen con 5 sub-turnos y la agenda igual que antes (lo reviso en pantalla).

## Decisión pendiente
Si preferís no tocar el código, hago solo los puntos 1 y 2. En ese caso, la agenda seguirá mostrando 5 filas por bloque.
