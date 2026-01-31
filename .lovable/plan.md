
# Plan: Alturas Uniformes en Sub-Slots del Calendario

## Problema Actual

El calendario tiene alturas inconsistentes para los sub-slots:

| Estado del sub-slot | Altura actual |
|--------------------|---------------|
| Con cita agendada | 60px |
| Vacío (sin cita) | 24px |

Esto crea una experiencia visual desigual donde los slots vacíos son muy pequeños comparados con los que tienen información.

---

## Solución Propuesta

Establecer una **altura uniforme de 60px** para todos los sub-slots, independientemente de si tienen cita o no.

---

## Cambios Técnicos

### Archivo: `src/pages/Calendar.tsx`

#### Cambio 1: Alturas dinámicas (líneas 443-446)

```typescript
// ANTES:
const rowHeights = Array.from({ length: 5 }).map((_, i) => 
  slotAppointments[i] ? '60px' : '24px'
).join(' ');

// DESPUES:
const rowHeights = 'repeat(5, 60px)';
```

#### Cambio 2: Slots completamente vacíos (línea 577)

```typescript
// ANTES:
style={{ gridTemplateRows: 'repeat(5, 24px)' }}

// DESPUES:
style={{ gridTemplateRows: 'repeat(5, 60px)' }}
```

#### Cambio 3: Ajustar sub-slots vacíos

Agregar altura mínima a los botones de sub-slots vacíos para que ocupen el espacio correctamente:

```typescript
// Botón de sub-slot vacío
className={`... h-full min-h-[56px] ...`}
```

---

## Resultado Visual

| Estado del sub-slot | Altura nueva |
|--------------------|--------------|
| Con cita agendada | 60px |
| Vacío (sin cita) | 60px |

Todos los sub-slots tendran la misma altura, creando una grilla uniforme y consistente.

---

## Archivos a Modificar

- **`src/pages/Calendar.tsx`**: 3 cambios puntuales para unificar alturas

---

## Beneficios

- Consistencia visual en toda la grilla del calendario
- Los sub-slots vacíos son mas faciles de clickear (area tactil mas grande)
- Mejor accesibilidad (objetivos tactiles >= 44px)
- Experiencia de usuario mejorada
