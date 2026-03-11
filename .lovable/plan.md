

# Plan: Mejorar Home pública + fix build error

## 1. Fix build error (ErrorBoundary.tsx)

Reemplazar `process.env.NODE_ENV` por `import.meta.env.DEV` (Vite no expone `process`).

## 2. Actualizar i18n (es.ts y en.ts)

Reestructurar `home` con las nuevas secciones:

- **hero**: Nuevo título, subtítulo, CTA "Solicitar demo", CTA alt "Hablar por WhatsApp"
- **productPreview**: 3 tarjetas con título + descripción (capturas placeholder)
- **features** (antes `solves`): Solo 4 items de funcionalidades (sin soporte)
- **support**: Bloque separado "Acompañamiento continuo" con 3 items
- **includes**: Lista simplificada de 6 items con nuevo heading "El sistema incluye"
- **trust**: Frase de confianza
- **audience**: "Diseñado para" con 4 items
- **maintenance**: Texto simplificado (software + acompañamiento)
- Eliminar `howItWorks` (no solicitado en la nueva estructura)
- Mantener `contact` igual

## 3. Actualizar Home.tsx

Reescribir las secciones del componente:

1. **Hero** — título grande, subtítulo, 2 CTAs (demo + WhatsApp)
2. **Product Preview** — 3 tarjetas con imagen placeholder + título + desc
3. **Features** — grid 2x2 con las 4 funcionalidades
4. **Support** — bloque simple con 3 items de acompañamiento
5. **Includes** — lista con checks (6 items)
6. **Trust** — bloque de texto centrado
7. **Audience** — "Diseñado para" con 4 items
8. **Maintenance** — texto simplificado
9. **Contact** — sin cambios

## 4. Navegación

Ya cumple: Inicio, Precios, Contacto, Iniciar sesión (+ Terms/Privacy en footer). No se toca `PublicLayout`.

## Archivos a modificar

- `src/components/shared/ErrorBoundary.tsx` — fix build error
- `src/i18n/es.ts` — nuevas keys de home
- `src/i18n/en.ts` — equivalentes en inglés
- `src/pages/Home.tsx` — nueva estructura de secciones

