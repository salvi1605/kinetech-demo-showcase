# Diagnóstico: "Rendered more hooks than during the previous render" al abrir detalle de turno

## Estado actual (verificado)

1. **Causa raíz ya corregida en código**: `AppointmentDetailDialog.tsx` y `FreeAppointmentDialog.tsx` tenían hooks declarados después de un retorno anticipado (`if (!appointment) return null`). React exige orden estable de hooks; al abrir un turno, el componente cambiaba su cantidad de hooks entre renders y la app entera caía en la pantalla "Algo salió mal". La corrección (mover todos los hooks antes del retorno) ya está aplicada en disco.

2. **El preview ya sirve el código corregido**: verifiqué el módulo que sirve el servidor de desarrollo (`curl` al archivo transformado) y todos los hooks (`useState` ×9, `useClinicSettings`, `usePatientAppointments`, `useForm`, `usePractitionerTreatments`, `useEffect` ×2) quedan antes del `return null`.

3. **Reproducción end-to-end con sesión real: SIN ERROR**. Con la sesión inyectada del usuario `salvi1605@gmail.com`:
   - Entré a "Seleccionar clínica" → "Ingresar como Propietario" → `/calendar`.
   - Hice clic en un turno ocupado ("Reservado").
   - El diálogo de detalle abrió correctamente (`role=dialog` visible).
   - **0 errores de consola, 0 errores de página, la pantalla "Algo salió mal" NO aparece.**

## Por qué el usuario sigue viendo el error

El navegador del usuario quedó con la pantalla de error persistida de la versión anterior (el ErrorBoundary captura el fallo y lo muestra hasta recargar). Además, la línea de tiempo lo confirma: el mensaje del usuario es de 01:35 UTC y la compilación con la corrección terminó a las 01:36 UTC — el usuario estaba ejecutando el bundle viejo.

## Plan

1. **Acción del usuario (sin código)**: en la pantalla de error, pulsar **"Recargar página"** (o recarga completa con Ctrl+Shift+R / Cmd+Shift+R) y repetir la acción: seleccionar una cita para ver el detalle.
2. **Verificación del usuario**: abrir 2–3 turnos distintos (con y sin paciente, distintos estados) y confirmar que el detalle abre sin error.
3. Si tras recarga completa el error reapareciera, capturo el stack exacto desde consola en una nueva reproducción dirigida a ese turno concreto.

## Alcance

- No hay cambios de código pendientes para este incidente: el arreglo ya está desplegado en el preview y verificado.
- No se tocan datos reales ni otros módulos.
