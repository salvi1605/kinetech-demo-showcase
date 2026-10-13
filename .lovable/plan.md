# Botón de WhatsApp para recordatorios manuales (solo preview)

## Diagnóstico
- **Detalle del turno:** los botones de email («Enviar información del turno» / «Enviar recordatorio») están en un bloque visible solo si el rol puede enviar (super_admin sin impersonar, admin_clinic, tenant_owner, receptionist) **y** la clínica tiene los emails activados. El recordatorio usa además `RoleGuard` (admin_clinic, receptionist, tenant_owner; super_admin heredado).
- **Ficha del paciente:** el botón «Enviar citas futuras» (email) está en el encabezado, dentro de `RoleGuard` (admin_clinic, tenant_owner, receptionist), con un motivo de bloqueo visible debajo.
- La ficha ya guarda el consentimiento **«Autoriza WhatsApp»** (`contactAuth.whatsapp`), igual que el de email. Las reglas del proyecto exigen respetar los consentimientos de contacto.
- Hoy no hay ninguna función para pasar teléfonos a formato internacional.

## Qué se va a construir
1. **Botón verde «WhatsApp»** con ícono, que abre `https://wa.me/<tel>?text=<mensaje>` en una pestaña nueva (`noopener,noreferrer`). No envía nada: el usuario revisa y envía desde WhatsApp.
2. **Detalle del turno:** el botón va al lado de «Enviar recordatorio», con los mismos roles. Va en su propio bloque «Recordatorio por WhatsApp», así se ve **aunque los emails de la clínica estén desactivados** (WhatsApp no depende de esa configuración).
3. **Ficha del paciente:** el botón va al lado de «Enviar citas futuras», con los mismos roles. Usa el **próximo turno programado** del paciente.
4. **Se desactiva, mostrando el motivo** (mismo patrón que el email), cuando:
   - el paciente no autorizó WhatsApp → «El paciente no autorizó recibir WhatsApp. Habilítalo desde su ficha.»
   - no tiene teléfono o el número no es válido → «El paciente no tiene un teléfono válido. Cárgalo desde su ficha.»
   - (solo en la ficha) no tiene turnos futuros.
   - el turno está cancelado o ya pasó (solo en el detalle).
5. **Mensaje** (texto rioplatense, como en tu ejemplo):
   «Hola {nombre}, te recordamos tu turno en {clínica} {hoy/mañana/el} {día} {DD/MM} a las {HH:mm} con {profesional}. Por favor confirmanos tu asistencia. ¡Gracias!»
   - Nombre: nombre preferido o primer nombre del paciente.
   - «hoy» / «mañana» se calcula en hora de Argentina; si no, «el martes 13/10».
   - El profesional se muestra tal cual está cargado (ej. «Lic. Telma Ayastuy»); no se agrega título.
   - Si falta el profesional, se omite «con …».

## Supuestos a validar
- **Consentimiento:** se bloquea si el paciente no tiene marcado «Autoriza WhatsApp». Si prefieres no exigirlo, se quita esa condición.
- **Sin registro de envíos:** como no podemos saber si el usuario realmente lo mandó, no se guarda historial. Se puede agregar luego si lo quieres.
- **Normalización de teléfono (Argentina):** se quitan espacios, guiones y paréntesis; se quita el `0` de larga distancia y el `15` de celular tras el código de área; se antepone `549` (formato que exige WhatsApp para celulares argentinos). Si el número ya empieza con `+` u otro código de país, se respeta. Menos de 10 dígitos locales = inválido.

## Detalles técnicos
- Nuevo `src/utils/whatsapp.ts`: `normalizeArPhoneForWhatsApp(phone)` (devuelve dígitos o `null`), `buildWhatsAppReminderMessage({...})` y `buildWhatsAppUrl(phone, text)` con `encodeURIComponent`. Fechas con `parseLocalDate` y formato DD/MM, horas HH:mm.
- Nuevo componente reutilizable `src/components/shared/WhatsAppReminderButton.tsx` (recibe teléfono, consentimiento, datos del turno; calcula el motivo de bloqueo; altura táctil ≥44px; `aria-describedby` al motivo).
- Color verde mediante un token semántico nuevo `--whatsapp` en `src/index.css` / `tailwind.config.ts` (sin colores fijos en el componente). Ícono: `MessageCircle` de lucide (lucide no tiene logo de WhatsApp).
- Integración en `AppointmentDetailDialog.tsx` y `PatientDetailTabs.tsx`; nombre de la clínica desde `state.currentClinicName`.
- Sin cambios en base de datos, funciones del servidor ni emails. Verificación con pruebas unitarias del normalizador/URL y Playwright en preview. Nada se publica.
