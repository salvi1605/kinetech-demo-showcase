

# Plan: Ocultar Herramientas de Desarrollo en Producción

## Resumen

Implementar una variable de entorno que permita mostrar/ocultar las herramientas de desarrollo (testing, emulación de roles, modo demo) para que en el branch `main` (producción) los usuarios finales no vean elementos que son solo para desarrollo.

---

## Elementos a Ocultar

Basándome en la captura de pantalla, estos son los elementos de desarrollo a ocultar:

| Elemento | Descripción | Ubicación |
|----------|-------------|-----------|
| Test: Fecha | Time Travel para simular fechas | Topbar |
| Selector de Rol | Emulador de roles (Propietario/Admin/etc) | Topbar |
| Modo Demo | Toggle para cargar datos de demostración | Topbar |
| Simular cambio de día | Botón para testing de cambio de día | Topbar |
| Badge DEMO | Indicador de modo demo en mobile | BottomNav |

---

## Solución Propuesta

### Opción Recomendada: Variable de Entorno `VITE_DEV_TOOLS`

Crear una variable de entorno específica que controle la visibilidad de las herramientas de desarrollo:

- **En desarrollo (branch `dev`)**: `VITE_DEV_TOOLS=true` → herramientas visibles
- **En producción (branch `main`)**: Variable ausente o `false` → herramientas ocultas

Esta opción es preferible a usar `NODE_ENV` porque:
1. Permite control granular independiente del entorno de build
2. Se puede habilitar temporalmente en producción si es necesario debuggear
3. Es explícita en su intención

---

## Cambios Técnicos

### 1. Crear constante de utilidad

**Archivo**: `src/lib/devTools.ts` (nuevo)

```typescript
export const isDevToolsEnabled = 
  import.meta.env.VITE_DEV_TOOLS === 'true' || 
  import.meta.env.DEV; // Siempre habilitado en desarrollo local
```

### 2. Modificar Topbar.tsx

Envolver los elementos de desarrollo en condicionales:

```tsx
import { isDevToolsEnabled } from '@/lib/devTools';

// En el JSX, envolver cada sección de desarrollo:
{isDevToolsEnabled && (
  <>
    {/* Time Travel Control */}
    ...
    
    {/* Role Emulator */}
    ...
    
    {/* Demo Mode Toggle */}
    ...
    
    {/* Day Change Simulator */}
    ...
  </>
)}
```

### 3. Modificar BottomNav.tsx

Ocultar el badge de DEMO:

```tsx
import { isDevToolsEnabled } from '@/lib/devTools';

// Cambiar la condición:
{isDevToolsEnabled && state.isDemoMode && (
  <Badge ...>DEMO</Badge>
)}
```

---

## Topbar Resultante en Producción

En producción, el Topbar mostrará solo:

| Elemento | Visible |
|----------|---------|
| Logo "Agendix" | Sí |
| Nombre de Clínica | Sí |
| Botón "Cambiar Clínica" | Sí |
| Email del usuario + Cerrar sesión | Sí |
| Botón de Settings | Sí |

---

## Configuración por Entorno

Para activar las herramientas de desarrollo, agregar al archivo `.env` del entorno deseado:

```env
VITE_DEV_TOOLS=true
```

> **Nota**: En Lovable, el archivo `.env` es manejado automáticamente. Para el branch `main` simplemente no incluir esta variable o establecerla en `false`.

---

## Archivos a Modificar

1. **`src/lib/devTools.ts`** - Crear nuevo archivo con la constante
2. **`src/components/layout/Topbar.tsx`** - Envolver elementos de desarrollo
3. **`src/components/layout/BottomNav.tsx`** - Ocultar badge DEMO

---

## Beneficios

- Separación clara entre herramientas de desarrollo y UI de producción
- Fácil de habilitar/deshabilitar sin cambiar código
- El rol del usuario vendrá de la base de datos, no del emulador
- Los datos reales se cargarán de la BD, no del modo demo

