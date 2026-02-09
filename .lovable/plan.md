

# Plan: Lineas divisorias mas oscuras en el calendario

## Problema

Las lineas divisorias actuales usan `border-border` y `border-border/50` o `border-border/60`, que son grises claros. Se necesitan lineas mas oscuras, cercanas al negro.

## Solucion

Reemplazar las clases de color de borde por `border-gray-400` (para lineas principales) y `border-gray-300` (para lineas secundarias entre slots), que son tonos mucho mas oscuros y cercanos al negro sin ser completamente negros.

## Cambios en `src/pages/Calendar.tsx`

### 1. Header "Hora"
- De: `border-b-2 border-r-2 border-border`
- A: `border-b-2 border-r-2 border-gray-400`

### 2. Headers de dias
- De: `border-b-2 border-r border-border`
- A: `border-b-2 border-r border-gray-400`

### 3. Celdas de hora (columna izquierda)
- De: `border-r-2 border-b border-border`
- A: `border-r-2 border-b border-gray-400`

### 4. Wrapper de cada celda de dia
- De: `border-r border-b border-border/50`
- A: `border-r border-b border-gray-300`

### 5. Celdas internas de slots (renderSlot)
- De: `border border-border/60`
- A: `border border-gray-300`

## Resultado

- Lineas principales (headers, columna de horas): gris oscuro (`gray-400` = #9ca3af)
- Lineas secundarias (entre slots): gris medio (`gray-300` = #d1d5db)
- Jerarquia visual clara entre divisiones principales y secundarias
- Aspecto mas definido y profesional

## Archivo a modificar

- `src/pages/Calendar.tsx` (5 cambios de clases CSS)

