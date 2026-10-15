# Textos del recordatorio (WhatsApp y email) — solo preview

Alcance: solo preview. Las pruebas se hacen en Clínica Demo (Ventas). No se tocan los datos de CTAK y no se publica nada sin el OK de Salvi.

## Cómo está hoy
- **WhatsApp:** el recordatorio termina con «Por favor confirmanos tu asistencia. ¡Gracias!». Agrega lugar y profesional y usa «el DD/MM».
- **Email:** el título es «Recordatorio de tu turno». Debajo va una tarjeta con fecha, hora, profesional, tratamiento, dirección y teléfono, y un pie que dice «Si no reconocés este turno… comunicate con la clínica». El pie tiene voseo.
- **Asunto:** hoy es «Recordatorio de tu turno - {fecha}». Si la clínica configuró un asunto propio, ese asunto reemplaza al de la plantilla.
- **Número de WhatsApp de la clínica:** ese campo no existe. La clínica solo tiene un «teléfono de contacto».

## Qué se hará
1. **WhatsApp:** el mensaje pasa a ser exactamente el texto que mandaste: «Hola [nombre], te recordamos tu turno del [día] a las [hora] en [clínica]. Si no vas a poder asistir, avisanos por acá para liberar tu lugar. ¡Te esperamos!». No lleva link, ni profesional, ni pedido de confirmación. Solo cambia el recordatorio: la información del turno y los próximos turnos quedan igual.
2. **Email:**
   - El asunto por defecto pasa a ser «Recordatorio de tu turno — [clínica]».
   - El cuerpo empieza con tu texto exacto.
   - El [link] es un enlace clicable a wa.me con el número de la clínica y este texto ya escrito: «Hola, soy [nombre]. No podré asistir a mi turno del [día] a las [hora].»
   - Si la clínica no tiene número válido para WhatsApp, en lugar del enlace se muestra el número como texto.
   - Si no hay ningún número, la frase se cierra sin dato de contacto.
   - La tarjeta de datos del turno y las instrucciones de la clínica se mantienen.
   - Se elimina el pie que invita a contactar a la clínica de otra forma, y en ningún lugar se invita a responder el email.
3. **Número de WhatsApp de la clínica:** se agrega el campo opcional «WhatsApp de la clínica» en «Configuración de clínica». Si está vacío, se usa el teléfono de contacto. Es un cambio que agrega un dato y no borra nada.
4. **Pruebas:** vista previa de los dos textos con datos de Clínica Demo (Ventas), clic en el enlace a wa.me y revisión de las tres variantes: con WhatsApp, solo con teléfono y sin número. No se envía nada real.

## Decisiones que necesito de ti
1. **Voseo:** en tu texto, «avisanos» es voseo. En tuteo neutro sería «avísanos». ¿Uso «avísanos» o respeto tu texto tal cual?
2. **Número de la clínica:** ¿agrego el campo «WhatsApp de la clínica» (propuesto) o uso directamente el teléfono de contacto que ya existe?
3. **Asunto propio de la clínica:** si una clínica configuró su propio asunto, ¿se sigue respetando (propuesto) o el nuevo asunto lo reemplaza siempre?
4. **[día]:** WhatsApp hoy usa «DD/MM» y el email usa la fecha completa («martes 7 de octubre»). ¿Unifico en «DD/MM» para los dos?

## Detalles técnicos
- `src/utils/whatsapp.ts`: `buildWhatsAppReminderMessage` con el texto nuevo, y un helper `buildWhatsAppCancelNoticeUrl(clinicPhone, name, day, time)` que reutiliza `normalizeArPhoneForWhatsApp` y `buildWhatsAppUrl`.
- `appointment-reminder.tsx`: props nuevas `clinicWhatsappUrl` y `clinicWhatsappDisplay`; asunto por defecto con la clínica; sin pie de respuesta; voseo restante corregido.
- `SendAppointmentInfoDialog.tsx`: arma el link en el cliente con el helper y lo pasa como datos de la plantilla. `send-appointment-email` valida que el link empiece con `https://wa.me/`.
- Migración aditiva: `clinics.whatsapp_phone text null`; campo nuevo en `EditClinicForm.tsx`.
- Al terminar se despliegan `send-appointment-email` y `preview-transactional-email`.
