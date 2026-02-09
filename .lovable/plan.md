
# Plan: Lineas divisorias mas visibles en el calendario

## Problema

Las lineas entre dias (columnas) y entre horas (filas) en el grid del calendario son muy tenues porque usan `border-border/30` (30% de opacidad) y el grid tiene `gap: 4px` sin bordes solidos entre celdas.

## Solucion

Cambiar el enfoque visual para que las divisiones sean mas gruesas y visibles, usando bordes solidos en lugar de bordes con baja opacidad.

## Cambios en `src/pages/Calendar.tsx`

### 1. Grid principal: quitar gap y usar bordes solidos

Cambiar el estilo inline del grid:
- De: `gap: '4px'`
- A: `gap: '4px'` (sin gap, los bordes de las celdas hacen la separacion)

### 2. Header "Hora": borde mas visible

- De: `border-b border-r bg-muted/10`
- A: `border-b-2 border-r-2 border-border`

### 3. Headers de dias: bordes mas gruesos

- De: `border border-border/30`
- A: `border-b-2 border-r border-border`

### 4. Celdas de hora (columna izquierda): borde derecho visible

- De: `border-r bg-muted/10`
- A: `border-r-2 border-b border-border bg-muted/10`

### 5. Celdas de slots (contenido): bordes visibles

- De: `border border-border/30` (en las celdas internas de `renderSlot`)
- A: `border border-border/60` o `border border-border`

### 6. Wrapper de cada celda de dia: agregar borde

Agregar `border-r border-b border-border/50` al div que envuelve cada `renderSlot` para marcar claramente la separacion entre columnas de dias y filas de horas.

## Resultado

- Lineas verticales (entre dias) claramente visibles
- Lineas horizontales (entre bloques de hora) claramente visibles
- Se mantiene el estilo limpio y profesional, solo se aumenta la visibilidad de las divisiones
- Sin cambios funcionales, solo visuales

## Archivo a modificar

- `src/pages/Calendar.tsx` (6 cambios puntuales en clases CSS)
