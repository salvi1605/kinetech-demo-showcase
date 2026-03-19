

# Animaciones suaves con framer-motion en menús del sistema

## Resumen
Instalar `framer-motion` y agregar animaciones de entrada (staggered fade-in) al contenido interno de todos los menús slide-out (Sheet) y a elementos de navegación del sistema.

## Alcance — Menús a animar

| Componente | Tipo | Animación |
|---|---|---|
| `PublicLayout.tsx` | Sheet mobile (hamburguesa) | Links con staggered fade-in desde la derecha |
| `Topbar.tsx` | Sheet mobile (user menu + dev tools) | Items con staggered fade-in |
| `BottomNav.tsx` | Sheet bottom ("Más opciones") | Grid items con staggered scale-in |
| `AppSidebar.tsx` | Sidebar nav items | Fade-in en mount inicial |

## Enfoque técnico

### 1. Instalar framer-motion
Agregar `framer-motion` como dependencia.

### 2. Crear componente reutilizable `AnimatedMenuItems`
Un wrapper que aplica `AnimatePresence` + `motion.div` con stagger a sus children, reutilizable en todos los menús.

```text
src/components/shared/AnimatedMenuItems.tsx (nuevo)
- Recibe children como array
- Aplica motion.div con variants: fadeInRight, scaleIn
- Stagger de 0.05s entre items
```

### 3. Aplicar en cada menú

- **PublicLayout.tsx**: Envolver los links del nav mobile en `AnimatedMenuItems`
- **Topbar.tsx**: Envolver items de los sheets mobile (user menu y dev tools)
- **BottomNav.tsx**: Envolver el grid de "Más opciones" con variante scale-in
- **AppSidebar.tsx**: Animar los nav items en el mount inicial

### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `package.json` | Agregar `framer-motion` |
| `src/components/shared/AnimatedMenuItems.tsx` | **Nuevo** — componente reutilizable |
| `src/components/layout/PublicLayout.tsx` | Usar AnimatedMenuItems en nav mobile |
| `src/components/layout/Topbar.tsx` | Usar AnimatedMenuItems en sheets mobile |
| `src/components/layout/BottomNav.tsx` | Usar AnimatedMenuItems en grid "Más" |
| `src/components/layout/AppSidebar.tsx` | Fade-in en items de navegación |

