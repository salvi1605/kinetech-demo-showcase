# Corregir el bloqueo general de acciones en el preview

## Diagnóstico confirmado

- La sesión de `salvi1605@gmail.com` está activa y las consultas del preview responden correctamente; no es un problema de conexión ni de permisos del rol.
- El error registrado es `Rendered more hooks than during the previous render` dentro de `AppointmentDetailDialog`.
- La causa exacta es que el estado del diálogo de envío de email se declara después de `if (!appointment) return null`. Al pasar de “sin turno seleccionado” a “turno seleccionado”, React ejecuta una cantidad distinta de hooks y el límite de errores bloquea toda la pantalla.
- Cambiar entre roles no puede resolverlo porque el fallo ocurre antes de evaluar las acciones permitidas para cada rol.

## Implementación

1. Mover el estado del diálogo de envío de email junto con los demás estados, antes de cualquier retorno condicional.
2. Mantener sin cambios la lógica de permisos, los datos y el flujo de envío de email.
3. Revisar los diálogos relacionados del calendario para confirmar que no haya otros hooks declarados después de retornos condicionales.
4. Validar en el navegador con la sesión autenticada:
   - abrir y cerrar el detalle de distintos turnos repetidamente;
   - editar, reprogramar y abrir las acciones disponibles;
   - cambiar entre los roles disponibles del usuario y repetir la apertura;
   - confirmar que no reaparezcan errores de React ni se bloquee la pantalla.
5. Verificar compilación, consola, errores de ejecución y solicitudes fallidas antes de cerrar.

## Alcance técnico

- Cambio principal: `src/components/dialogs/AppointmentDetailDialog.tsx`.
- Solo se tocarán otros diálogos si la revisión encuentra exactamente el mismo incumplimiento de las reglas de hooks.
- No se modificarán la base de datos, los roles, las políticas de acceso ni datos reales.
