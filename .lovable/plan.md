# Recordatorios: selector de canal + acciones (solo preview)

## Diagnóstico
- **Detalle del turno:** hoy hay tres bloques sueltos: «Enviar citas futuras» (email, junto a «Copiar Horarios»), «Información del turno por correo» (Enviar información / Enviar recordatorio) y «Recordatorio por WhatsApp». El email se oculta si la clínica tiene los emails desactivados.
- **Ficha del paciente:** en el encabezado están «Enviar citas futuras» (email) y «WhatsApp» (recordatorio del próximo turno). No existe «info de cita» ni «recordatorio» por email desde la ficha.
- Los diálogos de email ya existen: `SendAppointmentInfoDialog` (info / recordatorio, email editable solo para ese envío) y `SendUpcomingAppointmentsDialog` (citas futuras).
- WhatsApp hoy abre `wa.me` directo, sin ver ni editar el teléfono.

## Qué se va a construir
1. **Nuevo bloque «Recordatorios»** (componente reutilizable) que reemplaza los botones actuales de email y WhatsApp en ambos lugares:
   - **Nivel 1 – Canal:** toggle de 3 opciones `[WhatsApp] [Email] [Ambos]`.
   - **Nivel 2 – Acciones:** 3 botones con ícono y tooltip: Campana «Enviar recordatorio», Documento «Enviar info de cita», Calendario «Enviar próximos turnos». Tamaño táctil ≥44px y `aria-label` en cada uno.
2. **Combinaciones:**
   - WhatsApp + acción → abre el **diálogo de WhatsApp** (punto 3).
   - Email + acción → abre el diálogo de email existente que corresponde.
   - Ambos + acción → abre el diálogo de WhatsApp; al tocar «Abrir WhatsApp» se abre `wa.me` en pestaña nueva y a continuación el diálogo de email. Se hace en ese orden porque el navegador bloquea pestañas que no salen de un clic directo.
3. **Diálogo de WhatsApp (nuevo)**, mismo patrón que el email editable:
   - Teléfono precargado de la ficha, **editable solo para este envío**, con aviso «Este número se usa solo para este envío. No actualiza la ficha del paciente.» y validación del formato.
   - Vista previa del mensaje (solo lectura).
   - Botón «Abrir WhatsApp». Nada se envía solo.
4. **Mensajes por acción:**
   - **Recordatorio:** «Hola {nombre}, te recordamos tu turno en {clínica} el {día} {DD/MM} a las {HH:mm} con {profesional}. Por favor confirmanos tu asistencia. ¡Gracias!» (se quita el «hoy/mañana» actual para seguir tu texto).
   - **Info de cita:** «Hola {nombre}, te compartimos los datos de tu turno: 📅 {día DD/MM/AAAA} · 🕐 {HH:mm}–{HH:mm} · Profesional: {…} · Tratamiento: {…} · Clínica: {nombre}, {dirección}. Ante cualquier consulta, respondé este mensaje.» (cada dato en su línea; se omite lo que falte).
   - **Próximos turnos:** «Hola {nombre}, estos son tus próximos turnos en {clínica}:» + una línea por turno «• {día DD/MM} {HH:mm} – {profesional}» (máximo 10, con «y N más» si hay más).
5. **Qué turno usa cada acción:**
   - Detalle del turno: recordatorio e info usan **ese turno**; próximos turnos usa los futuros del paciente.
   - Ficha del paciente: recordatorio e info usan el **próximo turno programado**; próximos turnos, la lista.
6. **Bloqueos con motivo visible** (como hoy):
   - WhatsApp: sin consentimiento «Autoriza WhatsApp». Sin teléfono válido ya **no bloquea**: abre el diálogo para cargar un número de prueba.
   - Email: emails de la clínica desactivados o sin consentimiento de email → opción Email/Ambos deshabilitada con motivo.
   - Recordatorio / info: turno cancelado o pasado (detalle), o sin turno futuro (ficha). Próximos turnos: sin turnos futuros.
   - En «Ambos», si un canal está bloqueado la acción queda deshabilitada indicando cuál.
7. **Permisos:** mismos roles que hoy (admin_clinic, tenant_owner, receptionist; super_admin heredado). Profesionales no ven el bloque.

## Supuestos a validar
- En **Ambos**, el orden WhatsApp → email (por el bloqueo de pestañas del navegador).
- El mensaje de WhatsApp se ve pero **no se edita** en el diálogo (se puede editar en WhatsApp antes de enviar).
- Se agrega «Enviar recordatorio» e «info de cita» por **email desde la ficha** (hoy no existen allí), usando los diálogos actuales.
- El botón «Enviar citas futuras» que está junto a «Copiar Horarios» en el detalle pasa al nuevo bloque (Copiar Horarios queda donde está).

## Detalles técnicos
- `src/utils/whatsapp.ts`: `buildWhatsAppReminderMessage` (sin hoy/mañana), nuevos `buildWhatsAppAppointmentInfoMessage` y `buildWhatsAppUpcomingMessage`; validar teléfono editado con `normalizeArPhoneForWhatsApp`.
- Nuevo `src/components/dialogs/WhatsAppMessageDialog.tsx` (teléfono editable + preview + `onOpened` para encadenar el email en «Ambos»).
- Nuevo `src/components/shared/ReminderActions.tsx` (`ToggleGroup` + `Tooltip` de shadcn, cálculo de bloqueos por canal/acción, orquesta diálogos). Reemplaza el uso de `WhatsAppReminderButton` (se elimina si queda sin uso).
- Integración en `AppointmentDetailDialog.tsx` y `PatientDetailTabs.tsx`, reutilizando `SendAppointmentInfoDialog` y `SendUpcomingAppointmentsDialog` sin cambiarlos.
- Sin cambios en base de datos, funciones del servidor ni plantillas de email. Verificación: pruebas unitarias de los mensajes y Playwright con sesión real. Nada se publica.
