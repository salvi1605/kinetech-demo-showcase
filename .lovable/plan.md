
# Plan: Indicador visual de tratamiento exclusivo en el calendario

## Objetivo
Mostrar un icono de advertencia (triangulo rojo) en las citas del calendario cuando el tratamiento asignado es exclusivo (`max_concurrent === 1`), para identificarlas rapidamente.

## Enfoque

Usar el hook `useTreatments` (ya existente) en la pagina Calendar para construir un mapa de exclusividad por nombre de tratamiento, y agregar un icono `AlertTriangle` rojo en cada cita cuyo tratamiento sea exclusivo.

## Cambios

### 1. `src/pages/Calendar.tsx`

- **Importar `useTreatments`** desde `@/hooks/useTreatments`
- **Llamar al hook** junto a los demas hooks al inicio del componente
- **Crear un Set memoizado** de nombres de tratamientos exclusivos:
  ```typescript
  const exclusiveTreatmentNames = useMemo(() => {
    const set = new Set<string>();
    treatments.filter(t => t.max_concurrent === 1).forEach(t => {
      set.add(t.name.toLowerCase().trim());
    });
    return set;
  }, [treatments]);
  ```
- **Crear helper** para verificar si un appointment tiene tratamiento exclusivo, matcheando por el `treatmentType` del appointment contra los nombres normalizados (usando la misma logica de mapeo inverso que ya existe en `mapTreatmentTypeToInternal`)
- **Desktop (renderSlot, linea ~741-747)**: Agregar un `AlertTriangle` rojo pequeno junto al nombre del paciente o el badge de estado, con tooltip "Tratamiento exclusivo"
- **Mobile (linea ~1276-1287)**: Agregar el mismo indicador en la card mobile junto al nombre del paciente

### Indicador visual propuesto

Un pequeno triangulo de advertencia rojo (`AlertTriangle` de lucide-react, que ya esta importado) posicionado en la esquina superior derecha del slot de la cita, con un tooltip que diga "Exclusivo". Esto es discreto pero claramente identificable.

Implementacion en desktop:
```tsx
{isExclusive && (
  <Tooltip>
    <TooltipTrigger asChild>
      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
    </TooltipTrigger>
    <TooltipContent><p>Tratamiento exclusivo</p></TooltipContent>
  </Tooltip>
)}
```

### Logica de matching

Como el appointment almacena `treatmentType` como un string enum ('fkt', 'atm', 'drenaje', etc.) mapeado desde el nombre del tratamiento en BD, necesitamos hacer match inverso. La forma mas robusta es agregar `treatmentTypeId` al tipo Appointment y al hook `useAppointmentsForClinic`, ya que el campo `treatment_type_id` ya se consulta en la query pero no se mapea.

**Cambio en `src/contexts/AppContext.tsx`**: Agregar campo opcional `treatmentTypeId?: string` a la interfaz `Appointment`.

**Cambio en `src/hooks/useAppointmentsForClinic.ts`**: Mapear `treatment_type_id` al nuevo campo `treatmentTypeId` en la funcion de mapeo.

Luego en Calendar, el check de exclusividad es directo:
```typescript
const isExclusiveTreatment = (apt: Appointment) => 
  apt.treatmentTypeId ? exclusiveTreatmentIds.has(apt.treatmentTypeId) : false;
```

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/contexts/AppContext.tsx` | Agregar `treatmentTypeId?: string` a interfaz Appointment |
| `src/hooks/useAppointmentsForClinic.ts` | Mapear `treatment_type_id` al nuevo campo |
| `src/pages/Calendar.tsx` | Importar `useTreatments`, crear Set de IDs exclusivos, mostrar indicador visual en desktop y mobile |
