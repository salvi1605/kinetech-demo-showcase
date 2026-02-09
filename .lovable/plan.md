
# Plan: Seccion de Excepciones Completa

## Resumen

Construir la pagina de Excepciones (`/exceptions`) con CRUD completo y su integracion con el calendario principal para que las restricciones se reflejen visualmente y bloqueen la creacion de citas.

---

## 1. Tipos de excepciones a soportar

La tabla `schedule_exceptions` ya existe con estos campos: `id, clinic_id, practitioner_id (nullable), date, from_time (nullable), to_time (nullable), reason, type, created_by, created_at, updated_at`. RLS ya esta configurada.

Se usaran 3 valores para el campo `type`:

| type | Significado | practitioner_id | from/to_time |
|------|------------|-----------------|--------------|
| `clinic_closed` | Dia cerrado para toda la clinica | NULL | NULL |
| `practitioner_block` | Profesional no atiende ese dia o rango horario | obligatorio | opcionales (NULL = dia completo) |
| `extended_hours` | Horario extendido fuera de lo habitual | opcional (NULL = toda la clinica) | obligatorios |

Ademas, la tabla `holiday_calendar` (ya existente: `id, clinic_id, country_code, date, name`) se usara para feriados nacionales.

---

## 2. Pagina de Excepciones (`/exceptions`)

### 2.1 Layout

- **Header**: titulo + boton "Nueva Excepcion"
- **Tabs**: "Excepciones" | "Feriados"
- **Tab Excepciones**: tabla con filtros (por tipo, por profesional, rango de fechas), listado de schedule_exceptions con acciones editar/eliminar
- **Tab Feriados**: tabla de holiday_calendar + boton "Cargar feriados AR 2025/2026" + boton "Agregar feriado manual"

### 2.2 Dialogo Nueva/Editar Excepcion

Formulario con:
- **Tipo** (select): Dia cerrado | Bloqueo profesional | Horario extendido
- **Fecha** (date picker, obligatoria)
- **Profesional** (combobox, se muestra si tipo != clinic_closed, obligatorio para practitioner_block)
- **Rango horario** (TimePicker from/to, se muestra si tipo != clinic_closed, obligatorio para extended_hours)
- **Motivo** (textarea, opcional)
- Validacion con zod + react-hook-form
- Al guardar: insert/update en `schedule_exceptions`
- **Advertencia**: si tipo es `clinic_closed` o `practitioner_block` y hay citas ese dia, mostrar alerta amarilla con la cantidad de citas afectadas (solo advertir, no cancelar)

### 2.3 Dialogo Agregar Feriado

- Nombre (obligatorio)
- Fecha (obligatorio)
- Insert en `holiday_calendar` con clinic_id

### 2.4 Carga automatica de feriados AR

- Boton que inserta los feriados oficiales de Argentina del anio en curso
- Lista hardcodeada de feriados (no requiere API externa)
- Antes de insertar, verificar cuales ya existen para no duplicar
- Permitir editar/eliminar despues

---

## 3. Integracion con Calendario (`/calendar`)

### 3.1 Hook `useScheduleExceptions`

Nuevo hook que carga:
- `schedule_exceptions` para el rango de la semana visible
- `holiday_calendar` para las fechas de la semana

Retorna un mapa por fecha con las excepciones activas.

### 3.2 Indicadores visuales en el calendario

- **Dia cerrado / Feriado**: header del dia con fondo rojo/naranja claro + icono de alerta + tooltip con el motivo. Slots de ese dia deshabilitados visualmente (fondo gris rayado, no clickeables).
- **Bloqueo profesional**: cuando se filtra por ese profesional, los slots del rango bloqueado aparecen en gris con un indicador. Si no hay filtro, se muestra un icono sutil en el header del dia.
- **Horario extendido**: no bloquea slots; simplemente se refleja en que esos horarios extra aparecen como disponibles si estan dentro del rango extendido.

### 3.3 Bloqueo de creacion de citas

- Antes de abrir el modal de nueva cita (en `onSubSlotClick`), verificar si la fecha/hora cae dentro de una excepcion de cierre. Si es asi, mostrar toast con el motivo y no abrir el modal.
- En `NewAppointmentDialog` y `MassCreateAppointmentDialog`, la validacion existente de disponibilidad del profesional ya cubre parte de esto; se agrega una verificacion adicional contra `schedule_exceptions`.

---

## 4. Archivos a crear/modificar

### Nuevos archivos:
- `src/hooks/useScheduleExceptions.ts` - Hook para cargar excepciones y feriados por rango de fecha
- `src/components/dialogs/NewExceptionDialog.tsx` - Dialogo para crear/editar excepcion
- `src/components/dialogs/NewHolidayDialog.tsx` - Dialogo para agregar feriado manual
- `src/constants/argentineHolidays.ts` - Lista de feriados argentinos 2025-2026

### Archivos a modificar:
- `src/pages/Exceptions.tsx` - Reescribir con la UI completa (tabs, tablas, filtros, dialogos)
- `src/pages/Calendar.tsx` - Agregar indicadores visuales de excepciones en headers y slots, bloquear clicks en dias cerrados
- `src/components/dialogs/NewAppointmentDialog.tsx` - Verificar excepciones antes de crear cita
- `src/components/dialogs/MassCreateAppointmentDialog.tsx` - Filtrar slots que caen en excepciones

---

## 5. Detalles tecnicos

### Hook useScheduleExceptions

```typescript
// Consulta schedule_exceptions + holiday_calendar para un rango de fechas
// Retorna: Map<string(YYYY-MM-DD), ExceptionInfo[]>
// ExceptionInfo: { type, reason, practitionerId?, fromTime?, toTime?, isHoliday, holidayName? }
```

### Validacion en calendario

```typescript
// En onSubSlotClick, antes de abrir modal:
const exceptions = exceptionsMap.get(dateISO);
if (exceptions?.some(e => e.type === 'clinic_closed' || e.isHoliday)) {
  toast({ title: "Dia cerrado", description: e.reason || e.holidayName });
  return;
}
if (exceptions?.some(e => e.type === 'practitioner_block' && ...)) {
  // verificar si el profesional seleccionado esta bloqueado en ese horario
}
```

### Indicador visual en header de dia

```typescript
// En el header sticky del grid, si el dia tiene excepcion:
// - Agregar clase de fondo (bg-red-50 para cerrado, bg-amber-50 para feriado)
// - Agregar icono AlertTriangle con tooltip
// - En slots: overlay semi-transparente + cursor not-allowed
```

### Feriados argentinos (constante)

Lista de ~20 feriados por anio (inamovibles + trasladables), solo datos estaticos sin API externa.

---

## 6. Permisos (RLS ya existente)

- `admin_clinic` y `tenant_owner`: CRUD completo en excepciones y feriados
- `receptionist`: solo lectura de excepciones (ya cubierto por RLS)
- `health_pro`: puede gestionar sus propias excepciones (ya cubierto por RLS policy `exceptions_pro_manage_own`)
