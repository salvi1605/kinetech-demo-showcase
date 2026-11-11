# Plan: reportes completos en rangos largos (Operativo, Productividad, Tratamientos, Cumplimiento)

## Diagnóstico

Los cuatro reportes piden sus filas grandes en una sola consulta. El servidor devuelve como máximo 1000 filas por consulta, así que lo que pasa de 1000 se pierde sin ningún aviso.

Datos reales de los últimos 90 días (solo conteos, de lectura):

| Clínica | Turnos | Completados | No cancelados | Evoluciones |
|---|---|---|---|---|
| CTAK | 3817 | 3559 | 3817 | 3817 |
| Clínica Demo (Ventas) | 276 | 234 | 276 | 276 |

En CTAK, un mes ronda los 1270 turnos, así que **hoy hasta un rango de un mes sale incompleto**. En Cumplimiento hay dos consultas que se cortan: los turnos completados y las evoluciones. Por eso el porcentaje puede salir mal incluso cuando el corte afecta a las dos.

## Qué cambia

Solo cambia `src/hooks/useReportData.ts`. Las consultas grandes pasan a `fetchAllRows` (`src/utils/fetchAllRows.ts`), con `.order('id').range(from, to)` en tandas de 1000:

| Hook | Consulta que se pagina | Filtros que se mantienen idénticos |
|---|---|---|
| `useOperationalReport` | `appointments` | clinic_id, Desde/Hasta, profesional opcional |
| `useProductivityReport` | `appointments` | clinic_id, Desde/Hasta |
| `useTreatmentReport` | `appointments` | clinic_id, Desde/Hasta, `status <> cancelled`, profesional opcional |
| `useComplianceReport` | `appointments` **y** `patient_clinical_notes` | clinic_id, Desde/Hasta (`date` / `note_date`), `status = completed`, `note_type = evolution` |

**No cambia:**
- Las columnas pedidas, los filtros y las claves de caché.
- Todo el cálculo posterior: capacidad, desglose de estados, ocupación, horas, conteos por tratamiento y por mes, y la regla de evolución completada.
- Los componentes y lo que muestra cada reporte.
- Los otros cuatro reportes no tienen ninguna función de cálculo nueva, y la pestaña «Pacientes por profesional» queda igual.
- Las tablas chicas siguen con una sola consulta, porque están muy por debajo de 1000 filas por clínica: horarios (14–20), excepciones (126 en CTAK, filtradas además por rango), feriados, profesionales y tratamientos.
- No hay cambios en la base, en los permisos ni en el RoleGuard.

**Por qué el orden no altera los números:** `order('id')` usa la clave primaria, así que las tandas no se pisan ni dejan huecos. Todos los cálculos actuales son sumas y conteos, que no dependen del orden: filtran por fecha y estado y cuentan por profesional, tratamiento o mes.

**Errores:** si falla cualquier tanda, `fetchAllRows` lanza el error y la consulta queda en error, igual que hoy cuando falla la consulta única. Así nunca se muestra un número parcial.

**Costo:** CTAK con 90 días pasa a 4 pedidos en secuencia por reporte. Solo carga la pestaña abierta.

Observación que dejo fuera de esta tarea: en Operativo, las consultas de excepciones y feriados no revisan si hubo error. No lo toco, para no cambiar el comportamiento; si quieres, va aparte.

## Cómo verifico

1. **Pruebas automáticas nuevas** en `src/hooks/useReportData.test.tsx`, con el mismo estilo que `usePendingClinicalNotes.test.tsx` (cliente simulado y react-test-renderer), para cada uno de los cuatro hooks:
   - 2500 turnos simulados: el reporte cuenta los 2500, no 1000, y los pedidos son 0–999, 1000–1999 y 2000–2999 con `order('id')`.
   - 300 turnos: un solo pedido y el mismo resultado que antes.
   - Los filtros llegan intactos a cada tanda: clínica, fechas, profesional, `neq cancelled` y `completed`.
   - Cumplimiento: también se paginan 1500 evoluciones, y el porcentaje usa todas.
   - Si falla la segunda tanda, el reporte queda en error y no muestra datos parciales.
2. **Rango corto sin cambios (Clínica Demo, 19/10/2026 a 10/11/2026, menos de 1000 filas):** paso las filas reales por el cálculo viejo (consulta única) y por el nuevo (en tandas), y compruebo que los cuatro resultados sean idénticos campo por campo. También los comparo con conteos SQL directos: turnos por estado, por profesional, por tratamiento y evoluciones completadas.
3. **Rango largo completo (CTAK, últimos 90 días), solo lectura:** saco totales de control con SQL: 3817 turnos, 3559 completados, conteos por tratamiento y evoluciones completadas por profesional. Paso las filas por el cálculo nuevo y compruebo que coincida con esos totales y que el cálculo viejo se queda en 1000. Solo uso columnas sin datos personales (id, fecha, estado, profesional, tratamiento, duración, cobro). Del texto de la evolución solo uso si está vacía o no: nunca leo su contenido. No modifico nada de CTAK.
4. **Dentro de la app:** abro las cuatro pestañas en la Clínica Demo con un rango largo y reviso en pantalla que los totales coincidan con el paso 2. Para entrar con una cuenta que tenga acceso a la Demo, te voy a pedir aprobación para abrir la sesión de prueba.
5. Corro todas las pruebas del proyecto y reviso que la app compile sin errores.

## Decisiones que necesito

1. **Paso 3 con CTAK:** lectura de columnas sin datos personales, sin modificar nada. Si prefieres no usar CTAK ni para leer, hago el rango largo solo con datos simulados (paso 1).
2. **Sesión de prueba:** ¿me autorizas a pedir la sesión de salvi1605@gmail.com para el paso 4?

## Archivos

- Modifico `src/hooks/useReportData.ts`, solo en los cuatro hooks.
- Creo `src/hooks/useReportData.test.tsx`.
- Actualizo `AGENTS.md` con esta regla: las consultas de reportes que pueden pasar de 1000 filas se traen solo con `fetchAllRows`.
- Actualizo `roadmap.md`.

Todo queda solo en vista previa. No publico nada sin tu orden.
