# Imagen de AgendixPro para enlaces compartidos

## Diagnóstico técnico
- El escaneo actual confirma el hallazgo `agent_metadata:social_preview`.
- `index.html` contiene título, descripción y Open Graph, pero no `og:image` ni `twitter:image`.
- `src/components/shared/SeoHead.tsx` tampoco declara una imagen para las páginas públicas.
- Existe el logotipo oficial en `public/logo.png`; usarlo directamente no ofrece el formato panorámico adecuado para una vista previa social.
- Los servicios de enlaces compartidos leen el HTML inicial, por lo que agregar la imagen únicamente desde React no resuelve el problema.
- La respuesta publicada incluye una imagen inyectada por el alojamiento, pero el código no define una imagen de marca controlada por AgendixPro; no basta para dar este hallazgo por corregido.

## Plan de corrección
1. Crear una imagen de marca de **1200 × 630 px**, ligera, con el logotipo oficial, el nombre **AgendixPro** y la descripción «Software de agenda y gestión para clínicas». Usar los azules médicos y acentos verdes actuales, sin imágenes de Lovable ni datos de pacientes.
2. Subirla al almacenamiento de imágenes del proyecto y guardar su referencia; utilizar una URL **HTTPS absoluta**, pública y accesible sin iniciar sesión.
3. Agregar esa misma URL en `og:image` y `twitter:image`, tanto en `index.html` como en los metadatos públicos compartidos de `SeoHead.tsx`. Incluir tamaño y texto alternativo de la imagen.
4. Comprobar dimensiones, peso, acceso HTTP, formato y metadatos del HTML inicial y de las páginas públicas en la vista previa. Registrar la convención en `AGENTS.md`.
5. Marcar únicamente este hallazgo como corregido, pendiente de reescaneo, una vez completada y verificada la corrección.

## Alcance y publicación
- No cambiar textos existentes, precios, JSON-LD, páginas privadas, lógica de turnos, emails ni datos de clínicas.
- Implementar primero en **preview**. **No publicar** sin una indicación explícita posterior.
- La imagen llegará al sitio publicado en la próxima publicación; después, las plataformas sociales deberán volver a leer el enlace.

## Detalles técnicos
- Generar la composición a partir del logo existente, sin sustituirlo ni inventar una identidad nueva.
- Externalizar la imagen mediante `lovable-assets` y conservar su archivo `.asset.json` en el proyecto.
- La etiqueta estática de `index.html` cubre los lectores que no ejecutan JavaScript; `SeoHead` mantiene la misma imagen al navegar por páginas públicas.
- Si la URL HTTPS no puede verificarse públicamente, no marcar el hallazgo como corregido.
