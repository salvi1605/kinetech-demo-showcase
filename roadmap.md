# Pendientes — solo preview

- [x] Login: Paso 1 (app en preview). El paso de perfil reintenta una vez y nunca cierra la sesión; pantalla «No pudimos preparar tu cuenta» con Reintentar/Cerrar sesión; email normalizado en el login. Pruebas automáticas y reproducción descartable en base local OK. Sin publicar.
- [ ] Login: Paso 2 — aplicar la migración (perfil por cuenta, email en minúsculas) y desplegar ensure-public-user, create-user y update-user. Borrador en `.lovable/drafts/ensure_public_user_migration.sql`. Bloqueado: espera OK explícito (va directo a producción).
- [ ] Login: reproducción real en Clínica Demo con usuario de email en mayúsculas. Bloqueado: después del Paso 2.
- [ ] Login: Paso 3 — publicar la app. Bloqueado: OK del dueño.

- [x] Sitemap en producción: /kinesiologia sumado a la fuente de verdad `scripts/generate-sitemap.ts` (el generador la borraba del XML en cada build). Publicado y verificado en vivo: 8 URLs con /kinesiologia y home 200.

- [x] Reportes: 5ª pestaña «Pacientes por profesional» (pacientes distintos por profesional y tratamiento, subtotal por profesional, total del período; tandas de 1000). Conteo contrastado con SQL en Clínica Demo (50/234/4/7); pruebas pasan. No se pudo abrir con sesión de la Clínica Demo en la prueba automática. Solo preview, sin publicar.
- [x] Reportes Operativo, Productividad, Tratamientos y Cumplimiento: traer turnos/evoluciones con fetchAllRows (tandas de 1000) sin cambiar cálculos. QA solo con datos simulados y Clínica Demo (nunca CTAK). Solo preview, sin publicar.

- [x] Redes sociales en el pie público (Instagram, Facebook, TikTok, YouTube): URLs exactas, icono o nombre, pestaña nueva y etiqueta accesible; verificado en home, /kinesiologia y /pricing, escritorio y móvil 360, ES y EN. Solo preview, sin publicar.

- [x] Páginas públicas: home general (ES/EN, pregunta frecuente generalizada), nueva /kinesiologia solo con texto (sin video), título SEO de /pricing general y WhatsApp real en su botón, sitemap, llms.txt y pie de página. Pruebas y revisión escritorio/móvil ES/EN OK; solo preview, sin publicar.

- [x] Corregir banner profesional atascado: ocultar sin profesional, montar solo para health_pro e invalidar consultas obsoletas. Nueve pruebas pasan; preview con sesión propia verificado al cambiar semana y recargar, desktop/móvil sin errores. No se probó una sesión health_pro real ni se modificaron datos; sin publicar.

- [x] Imagen social de marca 1200×630 (42 KB): subida y HTTPS público HTTP 200; metadatos estáticos y compartidos verificados sin duplicados en home, precios y contacto; sin publicar.

- [x] Aplicar los pies aprobados de recordatorio e información y desplegar únicamente las funciones de email compartidas; render verificado sin enviar emails.
- [x] Informar todos los cambios actuales no publicados, sin publicarlos: permisos/textos de recepción, fechas del sitemap y documentación interna.
- [x] Auto-hospedar fuente Inter (400/500/600/700), quitar Google Fonts y verificar cero requests.
- [x] Recordatorios: selector de canal + acciones.
- [x] Testimonios de CTAK (Telma) en la home, ES/EN. Solo preview, sin publicar.
- [x] No-show con cargo (is_charged): agenda, detalle, reporte y sugerencia. Solo preview.
- [x] Fase 2 Configuración: limpieza de controles falsos (preview).
- [x] Corregir /unsubscribe: página informativa para enlaces antiguos, sin llamar a funciones eliminadas ni simular una baja; verificada en desktop/móvil.
- [x] Textos del recordatorio WhatsApp/email: copy exacto aprobado con «avísanos», enlace al teléfono existente de la clínica; variantes verificadas sin enviar emails.
- [x] Publicación previa verificada: producción devuelve HTTP 200 y sirve index-Be_E1rzD.js; recepción y fechas nuevas del sitemap siguen sin publicar.
- [x] Auditoría de Configuración (fase 1, solo informe, sin cambios).
- [x] Roles de plataforma (trigger+backfill), invisibilidad super_admin, mención legal soporte, voseo responde

- [x] Mensaje WhatsApp «próximos turnos»: cada línea en formato «Mié 21/10/2026 • 15:00 • Lic. Tomás Ibarra • ATM» (día abreviado, fecha con año, tratamiento incluido); pie del diálogo «Enviar próximos turnos» en tuteo. Solo preview, sin publicar.
