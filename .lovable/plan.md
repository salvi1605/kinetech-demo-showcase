# Diagnóstico: Discrepancia entre calendario y horarios copiados de Recepter G.

## Causa raíz

**No es un bug.** Es el comportamiento esperado del flujo de copia.

La cita de Recepter G. del viernes 06/03 fue:

- **Creada** el lunes 02/03 a las 12:58 (probablemente a las 08:00)
- **Actualizada** el jueves 05/03 a las 12:30 → se movió a **08:30**

Cuando Marianela copió los horarios el lunes, la cita todavía estaba a las 08:00. Después alguien la reprogramó a las 08:30. El texto copiado al portapapeles es una instantánea estática — no se actualiza retroactivamente al modificar la cita.

El calendario muestra correctamente el horario actual (08:30) porque consulta la base de datos en tiempo real.

## ¿Se necesita algún cambio?

Esto es comportamiento normal: copiar al portapapeles genera texto estático. Sin embargo, hay dos mejoras opcionales:

### Opción A: No hacer nada

El flujo es correcto. Simplemente informar a Marianela que si reprograma una cita después de copiar, debe volver a copiar los horarios actualizados.

### Opción B: Agregar advertencia visual (mejora UX)

Agregar un tooltip o nota sutil en el botón "Copiar horarios" que diga: *"Los horarios copiados reflejan el estado actual. Si se reprograman citas, copiar nuevamente."*

## Recomendación

**Opción A** — informar al equipo que después de reprogramar deben volver a copiar. No requiere cambios de código.