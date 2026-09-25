# Mejorar SEO y conversión de las páginas públicas

Alcance: solo Inicio, Precios, Contacto e Historia clínica digital. No se toca nada de la app interna.

## Diagnóstico

- **Inicio**: el título habla de "clínicas" en general y no nombra kinesiología, que es el cliente real. Las secciones listan funciones ("Gestión de agenda"), pero no explican qué gana la clínica (menos ausencias, menos papel, menos tiempo al teléfono). Solo hay una llamada a la acción arriba y otra al final.
- **Búsquedas reales en Argentina (Semrush)**: "historia clínica digital" tiene 1.600 búsquedas por mes y ya tiene su página. "Sistema de turnos" tiene 480 por mes y dificultad media. Frases como "software para kinesiólogos", "software para clínicas" y "agenda para consultorio" tienen pocas búsquedas (unas 20 por mes), pero muy buena intención de compra y competencia baja para posicionarse. Son las que más contactos pueden traer.
- **Precios**: no responde las dudas típicas antes de contactar: ¿hay que instalar algo?, ¿mis datos están seguros?, ¿cuánto tarda empezar?, ¿puedo cancelar?
- **Contacto**: cumple, pero no refuerza la confianza (qué pasa después de escribir).
- **Enlaces internos**: la página de historia clínica digital no aparece en el menú ni en Inicio, así que Google y los visitantes casi no llegan a ella.

## Qué propongo

1. **Inicio, textos orientados a la venta**
   - Título principal: "Software de agenda y gestión para clínicas de kinesiología", con subtítulo sobre el resultado (menos turnos perdidos, todo en un solo lugar).
   - Reescribir "Problemas" como dolor → solución.
   - Sección "Beneficios" con resultados concretos, sin prometer números inventados.
   - Bloque "Cómo empezar en 3 pasos", con botón a Contacto.
   - Botón de contacto repetido después de cada sección clave (WhatsApp y formulario).
   - Enlace destacado a "Historia clínica digital".
2. **Nueva sección de preguntas frecuentes** en Inicio y Precios, con 5 o 6 dudas reales antes de comprar. Solo usaré datos que ya existen: acceso web, soporte, implementación, precio en USD y datos protegidos.
3. **Precios**: una línea de valor encima del precio, el botón de contacto más visible y las preguntas frecuentes al final.
4. **Contacto**: texto "Qué pasa después de escribirnos" (respuesta en 24 h hábiles, llamada o demo, sin compromiso).
5. **Datos para Google**
   - Título y descripción de cada página, con las frases clave: kinesiología, sistema de turnos, software para clínicas y agenda para consultorio.
   - Añadir "Historia clínica digital" al menú y al pie de página.
   - Datos estructurados de "SoftwareApplication" con el precio publicado.
6. **Inglés**: se traduce todo lo nuevo para mantener el sitio bilingüe.

## Qué NO haré

- No inventaré testimonios, cifras de clientes ni porcentajes de mejora. Si quieres, puedes darme testimonios reales de CTAK u otra clínica y los agrego.
- No cambiaré precios ni condiciones.
- No tocaré el diseño general: mismos colores y estilo.

## Detalles técnicos

- Textos en `src/i18n/es.ts` y `en.ts` (secciones nuevas: `home.benefits`, `home.steps`, `faq`, `contact.nextSteps`).
- Cambios de estructura en `Home.tsx`, `Pricing.tsx` y `Contact.tsx`. Enlaces nuevos en `PublicLayout`.
- `SeoHead` por página con nuevos títulos y descripciones. JSON-LD `SoftwareApplication` en `index.html`.
- Una sola etiqueta H1 por página y encabezados H2 con palabras clave.
- Los cambios llegan a Google solo después de publicar.
