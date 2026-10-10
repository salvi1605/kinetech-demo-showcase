# Llenar la semana 19–23/10/2026 — "Clínica Demo (Ventas)"

## Diagnóstico (solo este tenant)
- Hoy hay 18 turnos esa semana (Lun 4, Mar 6, Mié 2, Jue 2, Vie 4). Sin feriados ni excepciones cargadas.
- Horarios: Martín y Carolina 08:00–12:00 (8 turnos/día), Tomás 09:00–17:00 (16/día), Sofía 13:00–19:30 (13/día). Hay lugar de sobra.
- La agenda muestra 5 sub-turnos por bloque de 30 min; algunos turnos existentes usan sub-turnos 6–8.
- Masaje, Drenaje linfático y Drenaje + Ultrasonido son exclusivos (1 por bloque): si los uso, el calendario muestra candado y bloquea el bloque. FKT, ATM, Vestibular y Otro admiten hasta 2 por bloque.

## Qué voy a cargar
- **55 turnos `scheduled`**, 11 por día (Lun–Vie), repartidos así por día: Martín 2, Carolina 3, Tomás 3, Sofía 3 (total semana: Martín 10, Carolina 15, Tomás 15, Sofía 15).
- Horarios distintos dentro de la franja de cada profesional, cubriendo toda la jornada 08:00–19:00 para que la grilla se vea llena.
- Tratamientos: FKT, ATM, Vestibular y Otro, rotando (nunca más de 2 del mismo tratamiento por bloque, contando los existentes). Masajes y drenajes no se usan para no generar candados.
- Pacientes: los 27 existentes, rotando; un paciente no se repite el mismo día.
- Sub-turnos 1–5 libres, sin chocar con los existentes ni con otros profesionales en el mismo horario.

## Garantías
- Los 18 turnos existentes no se tocan. Ningún otro tenant se toca.
- El trigger de la base crea la nota de evolución vacía de cada turno (comportamiento normal). Sin emails, colas ni publicación.
- Una sola transacción: si algo falla, no queda nada.

## Verificación
Conteo por día y por profesional de la semana, total semanal (esperado: 73) y chequeo de que no hay duplicados de horario/sub-turno.
