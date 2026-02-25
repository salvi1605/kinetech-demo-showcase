

# Eliminar scroll horizontal en la version movil

## Objetivo

Asegurar que en ningun caso aparezca scroll horizontal en dispositivos moviles (>=360px), dando una experiencia nativa y pulida.

## Cambios propuestos

### 1. Regla global anti-overflow horizontal

Agregar `overflow-x: hidden` al contenedor principal del layout para prevenir cualquier desbordamiento accidental.

**Archivo: `src/components/layout/AppLayout.tsx`**

En el div raiz (`min-h-screen flex w-full`), agregar `overflow-x-hidden`:

```tsx
<div className="min-h-screen flex w-full bg-background overflow-x-hidden">
```

### 2. Regla CSS de seguridad

Agregar una regla base en `index.css` que limite el `body` y `html` a no desbordar horizontalmente.

**Archivo: `src/index.css`**

```css
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}
```

### 3. Filtros con anchos fijos en Excepciones

Los `SelectTrigger` con `w-[200px]` pueden desbordar en pantallas de 360px cuando estan en fila. Cambiarlos a anchos responsivos.

**Archivo: `src/pages/Exceptions.tsx`**

Cambiar:
- `w-[200px]` a `w-full sm:w-[200px]`

Esto hace que en movil los selects ocupen todo el ancho disponible, y en pantallas mas grandes mantengan el ancho fijo de 200px.

### 4. Truncar textos largos en tablas movil

Verificar que las celdas de tabla visibles en movil tengan `truncate` y `max-w` para evitar que textos largos fuercen scroll.

**Archivo: `src/pages/Exceptions.tsx`** (celdas visibles en movil)

Agregar `truncate max-w-[150px]` a las celdas que no lo tengan.

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/AppLayout.tsx` | Agregar `overflow-x-hidden` al contenedor raiz |
| `src/index.css` | Regla CSS global `overflow-x: hidden` en html/body |
| `src/pages/Exceptions.tsx` | Selectores responsivos (`w-full sm:w-[200px]`) y truncado en celdas |

## Resultado esperado

- Cero scroll horizontal en cualquier pantalla movil desde 360px
- Los filtros se adaptan al ancho disponible
- Los textos largos se truncan en lugar de desbordar
- La experiencia es identica a una app nativa sin desbordamientos laterales

