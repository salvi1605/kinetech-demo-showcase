# Plan: Badge "N" (Nuevo) para primera visita del paciente

## Concepto

Mostrar un badge azul con "N" en las celdas del calendario cuando la cita corresponde a la primera vez que el paciente visita la clinica (no tiene citas previas en el sistema).

## Logica de deteccion

Crear un hook `useFirstVisitPatients` que:

1. Recibe la lista de `patientId`s unicos de las citas visibles en la semana
2. Hace una sola query agrupada: para cada paciente, obtiene la fecha de su cita mas antigua (`MIN(date)`) en la tabla `appointments` donde `status <> 'cancelled'`
3. Retorna un `Set<string>` con los IDs de pacientes cuya cita mas antigua coincide con alguna cita visible en la semana actual

```sql
-- Query conceptual
SELECT patient_id, MIN(date) as first_date
FROM appointments
WHERE clinic_id = ? AND patient_id IN (?) AND status <> 'cancelled'
GROUP BY patient_id
```

Si `first_date` del paciente cae dentro de la semana visible, ese paciente es "nuevo".

## Cambios

### 1. Nuevo hook: `src/hooks/useFirstVisitPatients.ts`

- Recibe `clinicId`, `patientIds[]`, `weekStart`, `weekEnd`
- Retorna `Set<string>` de patientIds que son primera visita
- Usa `supabase.rpc` o query directa con `.select('patient_id, date')` agrupado

### 2. Modificar `src/pages/Calendar.tsx`

- Invocar el hook con los patientIds de las citas de la semana
- En el render del slot ocupado (linea ~796), agregar badge "N" azul al lado del nombre cuando `isFirstVisit(appointment.patientId)` es true
- Badge: cuadro azul pequeno con "N" blanca, similar al badge de "Solo lectura" existente

### Visual

```text
┌─────────────────────────┐
│ ☑ García, M.            │
│   Dra. Mirian           │
│   Reservado     [N]     │
└─────────────────────────┘
```

El badge "N" aparece como un cuadrito azul compacto (`bg-blue-600 text-white text-[9px] rounded px-1`) junto al nombre del paciente.

## Rendimiento

- Una sola query por cambio de semana (no por cada celda)
- El Set se recalcula solo cuando cambian los appointments de la semana
- Sin impacto en el realtime ni en la carga de appointments