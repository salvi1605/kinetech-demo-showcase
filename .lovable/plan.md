

# Fix: Logo más grande y favicon profesional

## Problema
1. **Logo demasiado pequeño** — El archivo `logo.png` actual tiene padding interno excesivo, y las clases CSS usan tamaños conservadores (`h-11`, `h-8`, `w-8`).
2. **Favicon genérico** — El `favicon.png` actual no se distingue bien en la pestaña del navegador comparado con otros sitios.

## Solución

### 1. Regenerar assets visuales
- **`public/logo.png`** — Regenerar con el isotipo (calendario + símbolo médico) SIN texto, SIN padding extra, que ocupe el 90%+ del canvas. Resolución 512x512px.
- **`public/favicon.png`** — Regenerar a 64x64px con el mismo isotipo simplificado, colores sólidos y sin detalles finos que se pierdan a 16px.

### 2. Aumentar tamaños en código

| Ubicación | Actual | Nuevo |
|---|---|---|
| `PublicLayout` header | `h-11 w-11` | `h-12 w-12` |
| `PublicLayout` footer | `h-8 w-8` | `h-10 w-10` |
| `Welcome` header | `h-10 w-10` | `h-12 w-12` |
| `Welcome` footer | `h-8 w-8` | `h-10 w-10` |
| `Login` | `w-16 h-16` | `w-20 h-20` |
| `AppSidebar` | `w-8 h-8` | `w-9 h-9` |

### Archivos modificados (6)
1. `public/logo.png` — regenerado
2. `public/favicon.png` — regenerado
3. `src/components/layout/PublicLayout.tsx` — tamaños
4. `src/pages/Welcome.tsx` — tamaños
5. `src/pages/Login.tsx` — tamaños
6. `src/components/layout/AppSidebar.tsx` — tamaños

