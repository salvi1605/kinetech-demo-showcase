# Cobro de sesiones separado de la asistencia (Opción B)

## Diagnóstico
- La asistencia vive en el campo de estado del turno (scheduled / completed / no_show / cancelled). No hay ningún dato de cobro.
- Hoy pueden modificar turnos: administración (acceso total), recepción (acceso total) y profesionales (sus propios turnos). Si solo agregamos una casilla en la pantalla, recepción o un profesional podrían cambiar el cobro con una llamada directa. Por eso la restricción también va en la base de datos.
- El Reporte Operativo ya calcula sus métricas en un solo lugar compartido (reportMetrics), así que el nuevo desglose se agrega ahí sin tocar las métricas actuales.

## Cambios
1. **Base de datos (cambio solo aditivo y reversible)**
   - Nueva columna `is_charged boolean not null default false` en `appointments`, más `charged_at` y `charged_by` (nullable) para saber quién la marcó y cuándo.
   - Trigger `BEFORE UPDATE`: si cambia `is_charged`, solo lo permite si `is_admin_clinic(clinic_id)` o `is_tenant_owner()` o `is_super_admin()`; si no, error. Completa `charged_at`/`charged_by` automáticamente.
   - También rechaza `is_charged = true` en turnos `scheduled` o `cancelled` (solo vale para `completed` / `no_show`).
   - Los turnos existentes quedan en `false`: las estadísticas actuales no cambian.
   - Se registra en el historial de auditoría (audit_log) igual que los cambios de estado.

2. **Detalle del turno (asistencia)**
   - Debajo del selector de estado, un interruptor «Sesión cobrada» con su descripción:
     - En «No asistió»: «Marca esta opción si la ausencia se cobra (cancelación tardía, paquete prepago o política de la clínica).»
     - En «Asistió»: «Marca esta opción cuando la sesión ya esté cobrada.»
   - Solo lo ven administración y dueño (y super admin). Recepción y profesionales no lo ven.
   - Se guarda al instante con un aviso de confirmación; si falla, vuelve al valor anterior y muestra el error.
   - En el calendario, los turnos «No asistió» cobrados muestran una pequeña marca «Con cargo» (solo visible para administración y dueño).

3. **Reporte Operativo**
   - Se mantienen sin cambios todas las métricas actuales (Completados, No-shows, % Ocupación, etc.).
   - Nuevas tarjetas: «No-shows con cargo» y «No-shows sin cargo» (suman el total de No-shows), y «Sesiones cobradas» (completados + no-shows con cargo).
   - Nuevas columnas en la tabla por período y en el CSV.
   - Permisos sin cambios: solo administración y dueño.

4. **Copy**: español neutro con tuteo en todos los textos nuevos.

## QA (solo en Clínica Demo, 5de1222f-…)
- Pruebas unitarias del desglose (con/sin cargo, que la suma coincida con No-shows).
- Con sesión real: marcar un turno «No asistió» como cobrado, verlo en el detalle y en el Reporte Operativo; comprobar que un usuario de recepción no puede cambiarlo.
- Capturas de pantalla del detalle del turno y del reporte para tu revisión.
- No se tocan datos de CTAK. Nada se publica.

## Detalles técnicos
- Archivos: migración nueva, `src/utils/reportMetrics.ts` (+ test), `src/hooks/useReportData.ts` (select `is_charged`), `OperationalReport.tsx`, `AppointmentDetailDialog.tsx`, mapeo de turnos en `AppContext`/`useAppointmentsForClinic`, y una pequeña función de servicio `setAppointmentCharged` en `appointmentService.ts`.
- Recordatorios y RPCs de crear/editar turnos no se modifican.
