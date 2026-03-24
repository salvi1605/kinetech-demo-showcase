

# Reemplazar "Agendix" por "AgendixPro" en todo el proyecto

## Archivos a modificar

### 1. `index.html` (3 cambios)
- Línea 6: `<title>Agendix -` → `<title>AgendixPro -`
- Línea 8: `content="Agendix"` → `content="AgendixPro"`
- Línea 10: `content="Agendix -` → `content="AgendixPro -`

### 2. `src/pages/Welcome.tsx` (2 cambios)
- Línea 47: `>Agendix<` → `>AgendixPro<`
- Línea 125: `© 2026 Agendix.` → `© 2026 AgendixPro.`

### 3. `src/components/layout/Topbar.tsx` (1 cambio)
- Línea 184: `>Agendix<` → `>AgendixPro<`

### 4. `src/components/layout/AppSidebar.tsx` (1 cambio)
- Línea 223: `>Agendix<` → `>AgendixPro<`

### 5. `src/index.css` (1 cambio)
- Línea 5: comentario CSS `Agendix Design System` → `AgendixPro Design System`

### Sin cambiar
- `src/utils/obfuscateContact.ts` — No se toca. Los fragmentos `["agendix", "pro2026"]` ya se ensamblan correctamente como `agendixpro2026@gmail.com`.
- Todos los archivos que ya dicen "AgendixPro" (PublicLayout, i18n/es.ts, etc.) permanecen igual.

**Total: 8 reemplazos en 5 archivos.**

