

# Actualizar páginas legales para compatibilidad con Stripe

## Contexto
Las páginas de Términos, Privacidad y Cancelación necesitan mencionar precios, facturación y procesamiento de pagos externo para cumplir con los requisitos de Stripe. El usuario NO quiere pagos directos en la plataforma ni cancelación self-service — todo se gestiona manualmente vía soporte.

## Cambios

### 1. Términos del Servicio — Nueva sección "Precios y Facturación" (sección 3, renumerando las siguientes)

Contenido nuevo entre sección 2 y la actual sección 3:
- **Plan Inicial**: USD 500/mes + cargo único de setup
- **Programa Fundador**: USD 120/mes (oferta limitada)
- Moneda: USD. Facturación mensual recurrente
- Los pagos se procesan a través de un proveedor externo de pagos (Stripe), sujeto a sus propios términos
- AgendixPro no almacena datos de tarjetas de crédito
- La contratación se coordina con el equipo de soporte (no hay pago directo en la web)
- Renovación automática salvo cancelación previa

Las secciones actuales 3-8 pasan a ser 4-9.

### 2. Privacidad — Ampliar sección 4 (Proveedores externos)

Agregar mención explícita:
- Los pagos son procesados por un proveedor externo especializado (sin nombrar Stripe directamente, solo "procesador de pagos")
- AgendixPro no almacena números de tarjeta ni datos financieros sensibles
- El procesador de pagos opera bajo sus propias políticas de privacidad y estándares de seguridad (PCI-DSS)

### 3. Cancelación — Reforzar que es solo vía soporte

- Aclarar que la cancelación se solicita exclusivamente por correo o WhatsApp al equipo de soporte
- No existe opción de cancelación automática en la plataforma
- Mantener el aviso de 15 días y los 30 días de retención de datos

### 4. Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/i18n/es.ts` | Agregar sección de precios en `terms`, ampliar `privacy.s4body`, reforzar `cancellation.s1body` |
| `src/i18n/en.ts` | Mismos cambios en inglés |
| `src/pages/Terms.tsx` | Renderizar la nueva sección de precios y facturación |

### 5. Detalles técnicos

- En `es.ts` y `en.ts`, se agrega un bloque `s3` nuevo (precios/facturación) con `s3title`, `s3body`, `s3items` (lista de puntos sobre facturación) y `s3note`
- Las claves actuales `s3`-`s8` se renumeran a `s4`-`s9`
- En `Terms.tsx`, se agrega una `<section>` con `<ul>` para los items de facturación entre la sección 2 y la actual sección 3
- `privacy.s4body` se extiende con texto adicional sobre el procesador de pagos y PCI-DSS
- `cancellation.s1body` se ajusta para enfatizar "exclusivamente contactando al equipo de soporte por correo o WhatsApp"

