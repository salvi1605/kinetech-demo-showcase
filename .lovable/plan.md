

# Plan: Redefinir KPIs del Reporte Operativo

## Contexto
El reporte actual muestra: Capacidad, Ocupados, No-Shows, Cancelados. El usuario confirma que no manejan citas canceladas como categoría separada, y quiere 4 KPIs claros.

## Nuevos KPIs

| KPI | Definición | Color |
|---|---|---|
| **Capacidad** | Slots disponibles según disponibilidad de profesionales | Default |
| **Agendados** | Citas con status `scheduled` + `completed` + `no_show` (excluyendo `cancelled`) | Primary (azul) |
| **Asistieron** | Citas con status `completed` | Verde (accent) |
| **No Asistieron** | Citas con status `no_show` | Destructive (rojo) |

## Cambios

### 1. `src/hooks/useReportData.ts` (useOperationalReport)
- Reemplazar cálculos de `occupied` y `cancelled` por `attended` (`completed`) y `scheduled` (total - cancelled)
- Renombrar campos: `occupied` → `booked`, agregar `attended`, eliminar `cancelled`
- Ajustar `totals` para reflejar los nuevos campos
- Porcentajes: `occupancyPct` (agendados/capacidad), `attendancePct` (asistieron/agendados), `noShowPct` (no_show/agendados)

### 2. `src/components/reports/OperationalReport.tsx`
- KPI cards: Capacidad, Agendados, Asistieron, No Asistieron
- Gráfico de tendencia: líneas para % Ocupación y % No-Show
- Tabla de detalle: Período | Capacidad | Agendados | Asistieron | No Asistieron | % Ocupación
- CSV export: actualizar headers y datos

### 3. Sin cambios en base de datos
Todo es cálculo frontend sobre datos existentes.

