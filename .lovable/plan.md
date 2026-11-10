# Páginas públicas: home general + nueva /kinesiologia

Solo preview. No se toca la app interna (agenda, pacientes, reportes) ni la base de datos.

## Diagnóstico (estado actual)

- **Home (/)**: el H1 dice «Software de agenda y gestión para clínicas de kinesiología». El título SEO es «Software para kinesiólogos y clínicas…». La frase de confianza y «Diseñado para» también están centradas en kinesiología. Lo mismo pasa en inglés («physiotherapy clinics»).
- **HTML estático (lo que leen los buscadores antes de cargar la página)**: el título dice «kinesiólogos» y la descripción tiene voseo («Organizá…»). Uno de los datos estructurados también menciona kinesiología.
- **/pricing**: el H1 «Planes y servicio» ya es general. Solo el título SEO menciona «kinesiólogos» (en inglés, «physiotherapy»).
- **Error encontrado en /pricing**: el botón «Solicitar información» abre WhatsApp con un número de prueba (`5491161000000`), no con el número real que usa el resto del sitio. Esto no toca los precios.
- **Sitemap y archivo para asistentes de IA**: no incluyen /kinesiologia (todavía no existe).

## 1. Home general (ES y EN)

- Título SEO: «Sistema de agendas para clínicas y consultorios de salud | AgendixPro». La descripción también queda general.
- H1: «Sistema de agendas para clínicas y consultorios de salud».
- Subtítulo: misma idea, en general: «Turnos online, ficha de pacientes e historia clínica digital en un solo lugar. Menos turnos perdidos, menos papel y más tiempo para atender.»
- «Diseñado para»: clínicas de kinesiología (enlace a /kinesiologia), centros de fisioterapia y rehabilitación, consultorios de psicología, consultorios de nutrición, consultorios de odontología y otros profesionales de la salud con agenda por turnos.
- Confianza: «AgendixPro está siendo utilizado actualmente en clínicas y consultorios de salud para gestionar agenda, pacientes y operación diaria.»
- Los testimonios de CTAK, las funcionalidades, la historia clínica, los pasos, el acompañamiento, las preguntas frecuentes y los botones quedan iguales.
- HTML estático: título y descripción generales, sin voseo. También quito «kinesiología» del dato estructurado.

## 2. Nueva página /kinesiologia (ES y EN)

Usa el mismo diseño y la misma cabecera y pie de página que la home. Secciones, en orden:

1. **Gancho (H1)**: «¿Cuántos turnos se te pierden por semana?» y debajo el texto del guion («No porque no tengas pacientes, sino porque la agenda vive en tres lugares a la vez: un cuaderno, una planilla y diez chats de WhatsApp.»). Botón «Agenda tu demo de 15 minutos» → /contact.
2. **Espacio para el video**: marco 16:9 limpio con el texto «Espacio para el video de presentación». No lleva botón de reproducir ni video.
3. **El problema**: 4 tarjetas con los cuatro dolores del guion.
4. **La solución**: el párrafo de Salvador, textual.
5. **Cómo funciona**: 4 tarjetas (turnos y reprogramación, ausencias, recordatorios por correo, reportes).
6. **La prueba**: «CTAK, clínica de kinesiología en Buenos Aires, clienta desde abril de 2026». Muestra las tres citas exactas que enviaste, en español y sin cambios en los dos idiomas, con la autoría y la aclaración de autorización.
7. **Oferta y llamado**: demo en vivo de 15 minutos, sin compromiso, más el bloque de precio y el botón principal → /contact. También el botón de WhatsApp, como en la home.

SEO propio en ES y EN:
- ES: «Software de agenda para clínicas de kinesiología | AgendixPro»
- EN: «Scheduling software for physiotherapy clinics | AgendixPro»

Enlaces nuevos: desde «Diseñado para» de la home y desde el pie de página (ES «Kinesiología», EN «Physiotherapy»). También agrego la página al sitemap y al archivo para asistentes de IA.

## 3. /pricing

- Generalizo solo el título SEO en ES y EN. Los precios y el resto de los textos no cambian.
- Propongo corregir el número de WhatsApp del botón para que use el número real del sitio.

## Decisiones que necesito que confirmes (si no dices nada, aplico la opción indicada por defecto)

1. **Precio idéntico.** /pricing dice «USD 250/mes hasta 6 profesionales, más USD 30/mes por profesional adicional» y la puesta en marcha «Desde USD 250 (pago único)» con su desglose. Tu texto dice «puesta en marcha de USD 250».
   **Por defecto:** /kinesiologia muestra exactamente los mismos textos de /pricing, tomados de la misma fuente para que nunca puedan diferir: «Desde USD 250» y la nota de profesionales adicionales.
2. **Recordatorios.** Está prohibido que el sistema envíe recordatorios automáticos, y el texto de la home aprobado antes no los describe como automáticos ni como manuales. «Los recordatorios llegan por correo antes de la cita» suena a envío automático.
   **Por defecto:** «Puedes enviarle al paciente un recordatorio por correo antes de su cita.»
3. **Citas de CTAK.** Las tres frases que enviaste son fragmentos de las citas completas de la home. La regla guardada dice que las citas no se acortan sin nueva autorización. Tú indicas que estos fragmentos ya están autorizados.
   **Por defecto:** uso las tres frases exactas que enviaste, sin agregar ni quitar nada.
4. **Pregunta frecuente «¿Sirve para mi clínica de kinesiología o consultorio?»** Pediste dejar las preguntas frecuentes iguales.
   **Por defecto:** no la cambio. Si prefieres, la generalizo a «¿Sirve para mi clínica o consultorio?».
5. **WhatsApp de /pricing.** **Por defecto:** lo corrijo al número real.

## Verificación

- Pruebas pequeñas que se quedan en el proyecto:
  - El precio de /kinesiologia es el mismo que el de /pricing (USD 250/mes y puesta en marcha desde USD 250).
  - El H1 y el título SEO de la home no mencionan kinesiología.
- Revisión visual en el preview (escritorio y móvil, ES y EN) de /, /kinesiologia y /pricing.
- Revisión de voseo en cada texto nuevo.

## Detalle técnico

- `src/i18n/es.ts` y `en.ts`:
  - Cambian `home.hero`, `home.trust`, `home.audience.items` (pasan a `{ label, to? }`), `seo.home` y `seo.pricing`.
  - Se agregan el bloque `kinesiology` y `seo.kinesiology`, más `footer.kinesiology`.
  - Las citas de CTAK de /kinesiologia viven en un único lugar sin traducir y se renderizan con `lang="es"`.
- Nueva `src/pages/Kinesiology.tsx`, con `PublicLayout`, `SeoHead path="/kinesiologia"` y tokens del sistema de diseño. El precio se lee de `t.pricing.early.*`.
- `src/App.tsx`: ruta pública `/kinesiologia` con `PublicRouteGuard`, igual que las demás.
- `PublicLayout.tsx`: el enlace se agrega solo en el pie de página (no en el menú superior).
- `Home.tsx`: «Diseñado para» renderiza un `Link` cuando el ítem tiene `to`.
- `Pricing.tsx`: el botón de WhatsApp usa `getWhatsAppHref()`.
- `index.html`, `public/sitemap.xml` y `public/llms.txt`: se actualizan.
- Prueba nueva con vitest junto a la existente.
