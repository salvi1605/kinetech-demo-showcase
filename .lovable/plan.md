# Carga de datos demo enriquecidos — "Clínica Demo (Ventas)"

## Diagnóstico (estado actual, solo este tenant)
- 2 profesionales (Lic. Martín Demo, Lic. Carolina Prueba), ambos con el mismo color (#FADADD) y horario Lun–Vie 08:00–12:00.
- 5 pacientes, 9 turnos (todos `scheduled`, entre 09/10 y 26/10), 9 notas de evolución vacías (las crea un trigger automático).
- Configuración de la clínica: 08:00–19:00. Envío manual de emails habilitado (no se toca; la carga no envía nada).
- Restricciones de la base que condicionan la carga:
  - Un solo turno activo por clínica + fecha + hora + sub-turno (los turnos simultáneos de distintos profesionales deben usar sub-turnos distintos).
  - Al insertar un turno no cancelado, un trigger crea automáticamente su nota de evolución vacía (1 por turno). Las evoluciones se completan actualizando esa nota, no insertando otra.
  - Pacientes: DNI, fecha de nacimiento y teléfono obligatorios; DNI único por clínica.

## Qué voy a cargar (todo con `clinic_id` = Clínica Demo (Ventas))
1. **Profesionales (+2, total 4):** "Lic. Sofía Herrera" y "Lic. Tomás Ibarra", con colores distintos, especialidad, email @example.com y teléfono ficticio. Disponibilidad Lun–Vie: Sofía 13:00–19:30, Tomás 09:00–17:00. Tratamientos asignados (FKT, Masaje, ATM, etc.).
   - Supuesto: también cambio el color de los 2 profesionales existentes (hoy idénticos) para que la agenda se vea diferenciada. Es el único ajuste a registros existentes; si preferís no tocarlos, lo omito.
2. **Pacientes (+22, total 27):** nombres argentinos ficticios con los 4 campos de nombre, DNI ficticio único (serie 40.000.xxx), fecha de nacimiento, email `nombre.apellido@example.com`, teléfono `+54 11 5555-xxxx`, contacto de emergencia, obra social "Particular", consentimiento de email aceptado, preferencia de recordatorio email. Datos clínicos básicos como nota clínica inicial (motivo de consulta, antecedentes, dolor 0–10).
3. **Turnos (+~95, total ~104):** últimas 8 semanas y próximas 3, solo días hábiles y dentro del horario de cada profesional, con tratamiento asignado.
   - Pasados: ~80% `completed`, ~10% `no_show`, ~10% `cancelled`. Futuros: todos `scheduled`.
   - Historial de estados en `appointment_status_history` (scheduled → estado final) para los pasados.
   - Los 9 turnos existentes no se modifican ni se borran; se evitan choques de horario con ellos.
4. **Historia clínica:** en ~60% de los turnos `completed` completo la nota de evolución con un texto breve y profesional (y la marco completa); el resto queda pendiente, lo que también muestra los avisos de "evoluciones pendientes" en la demo.

## Garantías
- No se toca "Clínica Demo", "Kinesiología Demo", CTAK ni otro tenant: cada sentencia filtra o fija el `clinic_id` del tenant de ventas.
- No se envían emails ni se disparan colas, crons o funciones; no se publica nada.
- Todo en una sola transacción: si algo falla, no queda nada a medias.

## Verificación final (queries)
Conteos de profesionales, pacientes, turnos por estado y por semana, notas completadas, y comprobación de que los otros tenants quedaron con los mismos conteos que antes.
