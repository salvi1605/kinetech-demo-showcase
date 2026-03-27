

# Plan de Branding Completo para AgendixPro

## Resumen

Corregir 4 áreas de branding: metadatos SEO, logo/favicon, design system unificado y tipografía profesional.

---

## 1. Metadatos SEO — `index.html`

- Cambiar `lang="en"` → `lang="es"`
- Eliminar `og:image` apuntando a Lovable (`lovable.dev/opengraph-image-p98pqg.png`) — dejar vacío o apuntar a un asset propio cuando exista
- Cambiar `twitter:site` de `@lovable_dev` → `@agendixpro` (o eliminarlo si no tienen cuenta)
- Eliminar `twitter:image` de Lovable
- Agregar favicon link tag (ver paso 2)

---

## 2. Logo y Favicon

Generar un logo profesional usando la IA de imágenes (Nano banana pro) con estas directrices:
- Isotipo limpio: combinación de un ícono de calendario/agenda con un elemento médico sutil (cruz o pulso)
- Paleta: azul médico (`hsl(210, 85%, 45%)`) con acento verde salud (`hsl(142, 76%, 36%)`)
- Estilo: flat/minimal, legible a 16x16px para favicon
- Generar en formato PNG, guardarlo en `public/`

Archivos a modificar:
- `public/favicon.png` — nuevo archivo
- `public/logo.png` — nuevo archivo
- `index.html` — agregar `<link rel="icon" href="/favicon.png" type="image/png">`
- `src/components/layout/AppSidebar.tsx` — reemplazar el placeholder "A" con `<img src="/logo.png" />`
- `src/components/layout/PublicLayout.tsx` — agregar logo junto al texto "AgendixPro" en header y footer
- `src/pages/Welcome.tsx` — reemplazar el ícono Calendar por el logo
- `src/pages/Login.tsx` — agregar logo en la card de login

---

## 3. Unificar Design System — Eliminar colores hardcoded

Reemplazar todos los `bg-blue-700`, `bg-blue-600`, `bg-blue-900`, `border-blue-600` hardcoded con clases del design system existente.

Mapeo de reemplazos:

| Hardcoded | Reemplazo con design system |
|---|---|
| `bg-blue-700` | `bg-primary` |
| `bg-blue-900` | `bg-primary/90` o clase `active` con primary oscuro |
| `border-blue-600` | `border-primary/70` |
| `bg-blue-500` | `bg-primary` |
| `bg-blue-600` (badge) | `bg-primary` |
| `bg-blue-50` | `bg-primary/5` |
| `border-blue-200` | `border-primary/20` |
| `text-blue-900` | `text-primary` |
| `text-blue-600` | `text-primary` |
| `text-blue-500`/`text-blue-700` (NotFound) | `text-primary` |

Archivos afectados:
- `src/components/layout/AppSidebar.tsx` — sidebar completo (~6 reemplazos)
- `src/pages/Calendar.tsx` — badges de estado, slots seleccionados, barra de selección múltiple (~10 reemplazos)
- `src/pages/Exceptions.tsx` — badge de extended_hours (1 reemplazo)
- `src/pages/NotFound.tsx` — link de retorno (1 reemplazo)

---

## 4. Tipografía Profesional — Inter

Agregar **Inter** como fuente principal. Es una fuente sans-serif moderna, altamente legible, usada en interfaces médicas y SaaS profesionales. Gratis via Google Fonts.

Cambios:
- `index.html` — agregar `<link>` de Google Fonts para Inter (weights 400, 500, 600, 700)
- `src/index.css` — agregar `font-family: 'Inter', system-ui, sans-serif;` al body en `@layer base`
- `tailwind.config.ts` — agregar `fontFamily: { sans: ['Inter', ...defaultTheme.fontFamily.sans] }` en `theme.extend`

---

## Archivos modificados (total: ~8 archivos)

1. `index.html` — lang, metadatos, favicon, font link
2. `src/index.css` — font-family en body
3. `tailwind.config.ts` — fontFamily.sans
4. `src/components/layout/AppSidebar.tsx` — logo + colores unificados
5. `src/components/layout/PublicLayout.tsx` — logo en header/footer
6. `src/pages/Welcome.tsx` — logo
7. `src/pages/Calendar.tsx` — colores unificados
8. `src/pages/NotFound.tsx` — colores unificados
9. `src/pages/Exceptions.tsx` — colores unificados
10. `public/favicon.png` — nuevo (generado con IA)
11. `public/logo.png` — nuevo (generado con IA)

