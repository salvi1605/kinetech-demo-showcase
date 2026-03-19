

# Corrección de traducción hardcodeada en Home.tsx

## Problema encontrado
Tras revisar todas las páginas públicas (Home, Pricing, Contact, Terms, Privacy, Cancellation Policy) y el sistema de traducciones completo, solo hay **un problema**: en `Home.tsx` línea 207, el texto "WhatsApp" está hardcodeado en lugar de usar el sistema i18n.

## Sobre el botón de idioma
El botón actual ya sigue las mejores prácticas de la industria:
- **Desktop**: Icono Globe + código del idioma destino ("EN" o "ES")
- **Mobile**: Icono Globe + nombre completo ("English" o "Español")

Usar códigos de texto (EN/ES) en lugar de banderas es el estándar recomendado porque las banderas representan países, no idiomas, y pueden generar confusión (ej: ¿bandera de España o Argentina para español?). Sitios como Stripe, Linear y Notion usan este mismo patrón.

## Cambio necesario

| Archivo | Cambio |
|---------|--------|
| `src/pages/Home.tsx` | Línea 207: reemplazar `WhatsApp` hardcodeado por `{t.footer.whatsappButton}` |

Es un cambio de una sola línea. El resto del sitio público tiene todas las traducciones correctamente implementadas y coherentes entre ES e EN.

