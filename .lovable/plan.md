
# Plan: Headers de dias sticky en el calendario

## Problema

Al hacer scroll hacia abajo en el calendario para ver las horas mas tardias, los encabezados de los dias (Lunes, Martes, Miercoles, Jueves, Viernes) desaparecen, haciendo dificil saber en que columna/dia se esta mirando.

## Solucion

Hacer que la fila de encabezados de dias quede fija ("pinned") en la parte superior mientras se hace scroll vertical, de forma que siempre sean visibles.

## Enfoque Tecnico

### Archivo: `src/pages/Calendar.tsx`

### Cambio 1: Crear contenedor con scroll vertical

Envolver el area del grid en un contenedor con altura maxima calculada y `overflow-y: auto`, para que el scroll ocurra dentro de ese contenedor (requisito para que `position: sticky` funcione).

```
// ANTES: solo overflow-x-auto
<div className="overflow-x-auto">

// DESPUES: scroll en ambos ejes con altura limitada
<div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
```

La altura `100vh - 280px` descuenta el topbar (64px), el header de la pagina (~120px), el card header (~60px) y algo de padding, dejando el maximo espacio posible para el grid.

### Cambio 2: Hacer los headers del grid sticky

Aplicar `sticky top-0 z-20 bg-background` a las 6 celdas del header (celda "Hora" + 5 dias) para que se queden fijas al hacer scroll.

```
// Celda "Hora" - agregar sticky
<div className="p-2 text-sm font-medium ... sticky top-0 z-20 bg-background">
  Hora
</div>

// Celdas de dias - agregar sticky
<div className="p-1 border ... sticky top-0 z-20 bg-background">
  <div className="text-sm font-medium">{day}</div>
  <div className="text-xs ...">{fecha}</div>
</div>
```

### Cambio 3: Ajustar el WeekNavigatorCompact

El navegador de semana ya es `sticky top-0 z-10`. Para que quede por encima de los headers de dias, se movera fuera del contenedor con scroll, asi no compite por espacio sticky.

```
// Mover el WeekNavigator ANTES del contenedor scrollable
<div className="flex justify-end px-2 py-1">
  <WeekNavigatorCompact />
</div>
<div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
  <!-- Grid sin el navigator -->
</div>
```

## Resultado Visual

- Los encabezados de los dias se mantienen visibles al hacer scroll hacia abajo
- Las horas siguen desplazandose normalmente debajo de los headers
- El navegador de semana permanece siempre visible arriba del grid
- Sin cambios en la vista mobile (usa tabs, no tiene este problema)

## Archivos a Modificar

- `src/pages/Calendar.tsx`: 3 cambios puntuales en la seccion desktop del grid (lineas 830-883)
