# No-show con cargo (solo preview, QA en clínicas demo)

## Diagnóstico
- En el detalle del turno, la opción «No Asistió» guarda `cancelled` en vez de `no_show`. Por eso las inasistencias marcadas desde ahí se cuentan como cancelaciones y bajan la tasa de ausentismo. La agenda (checkbox tri-estado) sí guarda `no_show` correctamente.
- Hoy no hay ningún campo de cobro: un no-show cobrable no se puede registrar sin falsear el estado.
- Los turnos ya guardados como `cancelled` por este error no se distinguen de cancelaciones reales: **no se corregirán datos históricos** (sobre todo de CTAK). Solo se arregla hacia adelante.

## Pasos
1. **Base de datos (migración aditiva):** `appointments.is_charged boolean NOT NULL DEFAULT false`. Además un trigger de protección: solo `admin_clinic`, `tenant_owner` o `super_admin` de esa clínica pueden cambiar `is_charged` (recepción y profesionales reciben error aunque intenten saltear la UI). Al volver un turno a un estado distinto de `no_show`, `is_charged` se pone en false automáticamente para que no quede un cargo "huérfano".
2. **Fix de etiqueta en el detalle del turno:** `no_show → No Asistió` (en lugar de `cancelled`). Opciones finales: Reservado / Asistió / No Asistió.
3. **Agenda:** el checkbox queda igual. Solo en estado no_show aparece al lado un botón compacto «$» (mismo tamaño, área táctil accesible, `aria-pressed`, tooltip). Admin/dueño lo alternan; recepción lo ve deshabilitado (solo lectura); profesionales igual que recepción. Con cargo: insignia pequeña «con cargo» en la tarjeta. Los demás estados se ven idénticos a hoy. Actualización optimista con reversión y toast si falla.
4. **Detalle del turno:** si el estado es No Asistió, se muestra «Con cargo / Sin cargo» (interruptor editable para admin/dueño, texto para el resto).
5. **Reporte Operativo:** dos tarjetas y columnas nuevas «No-shows con cargo» y «No-shows sin cargo» (también en el CSV). El conteo «No-shows» existente no cambia; se cumple con cargo + sin cargo = No-shows. El cálculo vive en `reportMetrics.ts`, con test.
6. **Fase 2 — sugerencia (simple, la incluyo):** al marcar no_show (agenda o detalle), se calcula cuántas inasistencias previas tiene el paciente en ese mismo tratamiento en la clínica. 1ª → sugiere «sin cargo»; 2ª en adelante → sugiere «con cargo», con motivo visible («2ª inasistencia en este tratamiento»). **Nunca se marca cargo solo:** en la agenda el «$» muestra la sugerencia resaltada y el motivo en el tooltip; en el detalle aparece el aviso con un botón «Aplicar cargo» que requiere clic. Solo se ofrece a admin/dueño.

## QA (en «Clínica Demo (Ventas)», sin CTAK, sin emails)
Marcar un turno como no_show, alternar «$», ver la insignia, verificar que recepción no puede cambiarlo (también en la base), comprobar el fix del desplegable y el desglose del reporte. Build OK. Revertir los cambios de prueba al terminar. Nada a producción.

## Detalles técnicos
- Migración: columna + función trigger `SECURITY DEFINER` `BEFORE UPDATE` en `appointments` usando `is_super_admin()`, `is_admin_clinic(clinic_id)` y `is_tenant_owner()`/user_roles.
- Calendar.tsx: nuevo handler `toggleCharged` (update directo de `is_charged` filtrado por id y clinic_id); mapear `is_charged` en `useAppointmentsForClinic` / AppContext.
- Sugerencia: helper `suggestNoShowCharge(patientId, treatmentTypeId, clinicId, excludeId)` con un count filtrado; sin N+1 (se consulta solo al marcar).
- Regla nueva en AGENTS.md: el cobro es independiente del estado de asistencia.
