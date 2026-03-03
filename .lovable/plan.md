

# Plan: Ocultar Reportes en versión publicada

## Enfoque

Usar `window.location.hostname` para detectar si la app corre en preview (`*-preview--*.lovable.app`) o en producción (`agendixpro.lovable.app`). Si es producción, ocultar el acceso a Reportes.

## Cambios

### 1. Crear helper `src/lib/envFlags.ts`
Función `isPreviewEnv()` que retorna `true` si el hostname contiene `preview` (URLs de preview de Lovable siempre incluyen "preview" en el subdominio).

### 2. Modificar 3 archivos existentes
- **`src/components/layout/AppSidebar.tsx`**: Condicionar el item "Reportes" a `isPreviewEnv()`
- **`src/components/layout/BottomNav.tsx`**: Mismo filtro en `moreNavItems` para "Reportes"
- **`src/pages/Reports.tsx`**: Agregar redirect o mensaje si se accede directamente por URL en producción

## Resultado
- En preview: Reportes visible y funcional como hasta ahora
- En published: el item no aparece en sidebar ni bottom nav; acceso directo por URL muestra "No disponible"

