
# Plan: Modulo de Reportes

## Alcance

Se creara una nueva seccion `/reports` con 4 reportes organizados en tabs, accesible solo para `admin_clinic` y `tenant_owner`. Cada reporte incluira graficos interactivos (recharts, ya instalado), tabla de datos, y botones de exportar CSV y PDF.

---

## Reportes a implementar

### 1. Operativo: Ocupacion y No-Shows
**Que muestra:** porcentaje de ocupacion de la agenda y tasa de no-show/cancelacion por semana o mes.

**Fuente de datos:** tabla `appointments` agrupada por semana/mes, cruzada con `practitioner_availability` para calcular capacidad total.

**Metricas:**
- Slots disponibles vs ocupados (% ocupacion)
- Cantidad y % de no-shows
- Cantidad y % de cancelaciones
- Tendencia semanal/mensual (grafico de linea)

**Filtros:** rango de fechas, profesional (todos o individual)

---

### 2. Productividad Profesional
**Que muestra:** carga de trabajo comparativa entre profesionales.

**Fuente de datos:** `appointments` + `practitioners`

**Metricas:**
- Pacientes atendidos por profesional (bar chart horizontal)
- Tasa de no-show por profesional
- Horas efectivas trabajadas vs disponibles
- Promedio de pacientes/dia

**Filtros:** rango de fechas

---

### 3. Clinico: Sesiones por Tratamiento
**Que muestra:** distribucion de tratamientos y volumen por tipo.

**Fuente de datos:** `appointments` + `treatment_types`

**Metricas:**
- Cantidad de sesiones por tipo de tratamiento (pie chart + tabla)
- Evolucion mensual por tratamiento (stacked bar)
- Tratamientos mas frecuentes

**Filtros:** rango de fechas, profesional

---

### 4. Cumplimiento de Historias Clinicas (reporte especial solicitado)
**Que muestra:** comparacion entre citas atendidas vs evoluciones completadas por profesional.

**Fuente de datos:** `appointments` (status = 'completed') vs `patient_clinical_notes` (body no vacio, is_completed = true)

**Metricas:**
- Citas completadas por profesional
- Evoluciones completadas por profesional
- % de cumplimiento (evoluciones / citas completadas)
- Ranking de cumplimiento (bar chart comparativo)

**Filtros:** rango de fechas

---

## Estructura tecnica

### Archivos nuevos
1. `src/pages/Reports.tsx` - pagina principal con tabs para los 4 reportes
2. `src/components/reports/OperationalReport.tsx` - reporte de ocupacion/no-shows
3. `src/components/reports/ProductivityReport.tsx` - reporte de productividad
4. `src/components/reports/TreatmentReport.tsx` - reporte de tratamientos
5. `src/components/reports/ComplianceReport.tsx` - reporte de cumplimiento historias clinicas
6. `src/hooks/useReportData.ts` - hook con queries a la BD para cada reporte
7. `src/utils/reportExport.ts` - utilidades para exportar CSV y generar PDF (usando window.print con estilos)

### Archivos a modificar
1. `src/App.tsx` - agregar ruta `/reports`
2. `src/components/layout/AppSidebar.tsx` - agregar item "Reportes" con icono BarChart3, solo para admin_clinic/tenant_owner
3. `src/components/layout/BottomNav.tsx` - agregar acceso en mobile

### Consultas a la BD
Las queries se haran directamente con el cliente Supabase existente, sin necesidad de crear RPCs nuevas. Se usaran `SELECT` con agrupaciones y filtros por clinic_id, rango de fechas, y opcionalmente practitioner_id.

### Exportacion
- **CSV**: generacion en memoria con `Blob` + descarga (patron ya usado en `downloadSchema.ts`)
- **PDF**: se usara `window.print()` con una hoja de estilos `@media print` dedicada, sin dependencias externas

### Acceso
- RoleGuard con `['admin_clinic', 'tenant_owner']`
- Las tablas consultadas (appointments, practitioners, treatment_types, patient_clinical_notes) ya tienen RLS que filtra por clinica del usuario autenticado
