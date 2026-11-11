# Plan: Reporte "Pacientes por profesional" (solo preview)

## Qué va a ver el usuario
Una 5ª pestaña **"Pacientes por profesional"** en Reportes. Usa los filtros Desde / Hasta / Profesional que ya existen arriba (el filtro "Agrupar por" no aplica a esta pestaña y no lo toca). Muestra:

1. Tarjeta superior: **"Total pacientes distintos en el período: N"** (más el total de turnos completados como dato secundario).
2. Una tarjeta por profesional con su nombre y su subtotal de pacientes distintos, y una tabla **Tratamiento | Pacientes distintos | Turnos**.
3. Nota breve debajo de la tarjeta superior:
   > «Solo cuenta turnos completados. Un paciente que se atendió con varios profesionales o tratamientos aparece en cada fila que le corresponde, pero cuenta una sola vez en el total del período, así que el total puede ser menor que la suma de las filas.»
4. Mientras carga, esqueletos (igual que Tratamientos). Si no hay datos: «No hay datos para el rango seleccionado.» Si falla la consulta: «No se pudo cargar el reporte. Intenta de nuevo.» (las pestañas actuales no muestran error; esta sí, para que no se confunda un error con "sin datos").

Sin nombres de pacientes en ningún lugar, sin exportación nueva (el botón global Imprimir / PDF ya cubre esta pestaña), sin presets de fecha, sin voseo.

## Archivos
| Archivo | Cambio |
|---|---|
| `src/utils/reportMetrics.ts` | Nueva función pura `calculatePractitionerPatients(appointments, practitioners, treatments)` con toda la lógica de conteo. Va aquí por la regla de AGENTS.md: las agregaciones de reportes viven en este archivo. |
| `src/utils/reportMetrics.test.ts` (nuevo) | Pruebas de la regla de conteo (ver abajo). |
| `src/hooks/useReportData.ts` | Nuevo hook `usePractitionerPatientsReport(filters)`: patrón de `useTreatmentReport` (useQuery + cliente, `clinic_id` + rango + profesional opcional) y llama a la función pura. |
| `src/components/reports/PractitionerPatientsReport.tsx` (nuevo) | Vista con el estilo de `TreatmentReport` (tarjetas `bg-card rounded-lg border`, shadcn `Table`, `Skeleton`, punto de color del tratamiento). Sin gráficos. Clase `report-printable` para Imprimir / PDF. |
| `src/pages/Reports.tsx` | Nuevo `TabsTrigger value="patients"` y `TabsContent`, pasa `dateFrom`, `dateTo` y `practitionerId` (misma conversión `'all'` → undefined que Tratamientos). Agrega `patients: 'Pacientes por Profesional'` a `tabTitles` para el título del PDF. |
| `roadmap.md`, memoria de Reportes | Registrar la 5ª pestaña (la memoria hoy lista solo cuatro reportes). |

No hay cambios en la base de datos, permisos, agenda ni historias clínicas.

## Lógica de conteo exacta
**Consulta** (solo columnas necesarias, nunca `patients`):
```
appointments.select('id, patient_id, practitioner_id, treatment_type_id')
  .eq('clinic_id', clinicId)
  .eq('status', 'completed')
  .gte('date', dateFrom).lte('date', dateTo)
  [.eq('practitioner_id', practitionerId) si hay filtro]
  .order('id')
```
Más los catálogos de la propia clínica, para poner nombres:
- `treatment_types.select('id, name, color').eq('clinic_id', clinicId)` **sin** filtrar `is_active`, para que un tratamiento desactivado después siga con su nombre en turnos históricos.
- `practitioners.select('id, display_name, color, is_active').eq('clinic_id', clinicId)` **sin** filtrar `is_active`, por la misma razón; los inactivos se muestran con "(inactivo)".

**Agregación** (en la función pura, equivalente al SQL que verificaste):
- Grupo = (profesional, tratamiento). Por grupo: `Set` de `patient_id` → **Pacientes distintos** = tamaño del Set; **Turnos** = cantidad de turnos del grupo.
- Subtotal por profesional = tamaño de un `Set` propio de `patient_id` del profesional (tampoco es suma de filas).
- **Total distinto del período** = tamaño de un único `Set` global con todos los `patient_id` del conjunto filtrado. Se calcula aparte, **nunca** sumando filas. Si hay filtro de profesional, el conjunto ya viene limitado, así que el total también.
- Orden: profesionales por nombre; tratamientos por pacientes distintos desc, luego nombre; "Sin clasificar" al final.

**treatment_type_id NULL** → fila **"Sin clasificar"** (color neutro del tema). Si el id apunta a un tratamiento que no está en el catálogo de la clínica (no debería pasar; hoy hay 0 casos cruzados) también cae en "Sin clasificar", nunca rompe. CTAK tiene hoy 144 turnos completados sin tratamiento, así que este caso es real.

**patient_id NULL** → el turno cuenta en **Turnos** de su fila, pero no suma a ningún conteo de pacientes (no se puede identificar a la persona). Hoy hay 0 casos, pero queda cubierto y probado.

**Profesional borrado o ajeno** (id sin coincidencia): se muestra "Profesional sin identificar", nunca un UUID.

## Volumen: límite de 1000 filas
El servidor devuelve como máximo 1000 filas por consulta. CTAK tiene unos 3550 turnos completados en los últimos 90 días, así que una sola consulta cortaría los datos y el total sería falso. El hook pedirá los turnos en tandas de 1000 con `.range()` (ordenado por `id`) hasta traer todo. Son pocas consultas (unas 4 para 3 meses de CTAK).

> Hallazgo aparte (fuera de este pedido, no lo toco): los reportes actuales (Operativo, Productividad, Tratamientos, Cumplimiento) hacen una sola consulta y en clínicas grandes como CTAK pueden estar mostrando números incompletos en rangos largos. Lo dejo anotado para que decidas si se corrige después.

Alternativa si prefieres: una función en la base de datos que devuelva los conteos ya agregados con `COUNT(DISTINCT)`. Es más eficiente para rangos de un año, pero agrega una pieza nueva con control de permisos propio. Recomiendo las tandas por ser el patrón actual y no tocar la base.

## Seguridad y acceso
- La pestaña vive dentro de `ReportsContent`, que solo se renderiza dentro del `RoleGuard` de `Reports` con `allowedRoles={['admin_clinic','tenant_owner']}` (más super_admin sin suplantación, como el resto de Reportes). health_pro y receptionist reciben «No tienes acceso a esta sección.» y la pestaña no existe para ellos. No se agrega ningún guard nuevo ni ruta nueva.
- Aislamiento: todas las consultas filtran por `state.currentClinicId` y la base sigue aplicando sus reglas de acceso; el `queryKey` incluye `clinicId`, así que al cambiar de clínica no se mezclan datos en caché.
- Nunca se consulta `patients`; los `patient_id` solo se usan en memoria para contar y no se muestran.

## Verificación
1. **Pruebas** (`reportMetrics.test.ts`), con datos de prueba armados para que el total ≠ suma de filas:
   - Un paciente con 2 tratamientos del mismo profesional → cuenta 1 en cada fila, 1 en el subtotal del profesional, 1 en el total.
   - Un paciente con 2 profesionales → 1 en cada profesional, 1 en el total (total < suma de filas).
   - Mismo paciente 3 turnos en un grupo → Pacientes distintos 1, Turnos 3.
   - `treatment_type_id` null → fila "Sin clasificar".
   - `patient_id` null → suma a Turnos, no a pacientes.
   - Lista vacía → total 0, sin profesionales.
   - Prueba del hook con cliente simulado: 1000 + 500 filas → se piden 2 tandas y se cuentan las 1500.
2. **Contraste con tu SQL** en Clínica Demo (Ventas), 19/10/2026 a 10/11/2026: debe dar 50 pacientes distintos, 234 turnos, 4 profesionales, 7 tratamientos. Ojo: en la Demo cada paciente tiene un único profesional y tratamiento (la suma de filas también da 50), por eso la diferencia total vs. suma se prueba con los datos de prueba del punto 1.
3. **Preview con sesión real** (Playwright): abrir Reportes → "Pacientes por profesional" en ese rango, comparar números; elegir un profesional y confirmar que el total baja a sus pacientes; rango sin turnos → estado vacío; revisar escritorio y móvil 360 px sin scroll horizontal.
4. **RoleGuard**: prueba de render de `Reports` con rol `health_pro` y `receptionist` → aparece «No tienes acceso a esta sección.» y no aparece la pestaña; con `admin_clinic` y `tenant_owner` sí aparece.
5. Nada se publica.

## Decisiones que confirmo con tu aprobación
- Tratamientos y profesionales inactivos se incluyen si tienen turnos completados en el rango (con "(inactivo)" en profesionales).
- Tandas de 1000 en lugar de una función nueva en la base.
- Se muestra un subtotal de pacientes distintos por profesional (además del total del período).
