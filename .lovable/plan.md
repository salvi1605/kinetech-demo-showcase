

# Calendario movil: header fijo y preservacion de scroll al cambiar de dia

## Problema actual

En la vista movil del calendario:
1. Los tabs de dias (Lun, Mar, Mie, Jue, Vie) no quedan fijos al hacer scroll vertical -- se pierden de vista al bajar
2. Al cambiar de dia seleccionado, el scroll vuelve al inicio en vez de mantener la misma hora visible

En desktop esto ya funciona correctamente gracias a `sticky top-0` en los headers y al sistema de `savedScrollHour` / `scrollContainerRef`.

## Solucion

### 1. Header de dias fijo (sticky) en movil

Envolver el `TabsList` y el `WeekNavigatorCompact` en un contenedor sticky que quede fijo en la parte superior del area de scroll. Para esto, el contenido de cada `TabsContent` necesita estar dentro de un contenedor con scroll controlado (similar al `scrollContainerRef` de desktop).

### 2. Preservar posicion de scroll al cambiar de dia

Agregar un `useRef` para el contenedor de scroll movil y capturar/restaurar la hora visible al cambiar de dia, reutilizando la misma logica que ya existe para desktop.

## Cambios tecnicos

### Archivo: `src/pages/Calendar.tsx`

**Seccion movil (lineas ~1139-1301):**

1. Agregar un ref para el scroll container movil: `mobileScrollRef`
2. Capturar la hora visible antes de cambiar de dia en `onValueChange` del `Tabs`
3. Restaurar la hora visible despues de que el nuevo dia se renderice (via `useEffect` que observe `selectedDay`)
4. Reestructurar el layout movil para que:
   - El `WeekNavigatorCompact` + `TabsList` queden en un bloque sticky
   - El contenido de slots este dentro de un div con `overflow-y-auto` y `max-height` calculada (similar al desktop)
   - Cada fila de hora tenga el atributo `data-time-row-mobile` para poder localizar la hora al restaurar scroll

**Estructura resultante:**

```text
div.md:hidden (contenedor movil)
  Tabs
    div.sticky.top-0.z-10.bg-background
      WeekNavigatorCompact
      TabsList (Lun | Mar | Mie | Jue | Vie)
    div ref={mobileScrollRef} overflow-y-auto max-h-[calc(100vh-Xpx)]
      TabsContent (contenido de slots con data-time-row-mobile)
```

**Logica de scroll:**

```typescript
// Nuevo ref para movil
const mobileScrollRef = useRef<HTMLDivElement>(null);
const savedMobileScrollHour = useRef<string | null>(null);

// Capturar hora visible antes de cambiar dia
const handleMobileDayChange = (newDay: string) => {
  // Capturar scroll actual
  const container = mobileScrollRef.current;
  if (container) {
    const rows = container.querySelectorAll('[data-time-row-mobile]');
    // encontrar la hora mas cercana al top visible
    ...
  }
  setSelectedDay(parseInt(newDay));
};

// Restaurar scroll despues del cambio de dia
useEffect(() => {
  if (!savedMobileScrollHour.current) return;
  const container = mobileScrollRef.current;
  if (!container) return;
  const target = container.querySelector(`[data-time-row-mobile="${savedMobileScrollHour.current}"]`);
  if (target) {
    container.scrollTo({ top: target.offsetTop - container.offsetTop, behavior: 'instant' });
  }
}, [selectedDay]);
```

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/pages/Calendar.tsx` | Reestructurar vista movil: header sticky, scroll container con ref, preservacion de hora al cambiar dia |

## Resultado esperado

- Al hacer scroll vertical en movil, los tabs de dias permanecen visibles en la parte superior
- Al cambiar de dia (ej: de Lunes a Martes), el scroll se mantiene en la misma franja horaria que se estaba viendo
- Comportamiento identico al de la vista desktop en cuanto a navegacion y persistencia visual
