# Gestion de Tratamientos y Vinculacion con Profesionales

## Resumen

Crear una seccion "Tratamientos" en la navegacion (debajo de Profesionales) donde se puedan gestionar los tipos de tratamiento de la clinica, vincularlos a profesionales especificos, y validar al agendar citas que el profesional seleccionado pueda realizar el tratamiento elegido.

## Cambios en Base de Datos

### 1. Nueva tabla: `practitioner_treatments`

Tabla de relacion muchos-a-muchos entre profesionales y tratamientos:

```text
practitioner_treatments
  id          uuid PK
  practitioner_id  uuid FK -> practitioners(id) ON DELETE CASCADE
  treatment_type_id uuid FK -> treatment_types(id) ON DELETE CASCADE
  clinic_id   uuid FK -> clinics(id) ON DELETE CASCADE
  created_at  timestamptz
  UNIQUE(practitioner_id, treatment_type_id)
```

Con politicas RLS similares a practitioners (admin full access, receptionist/health_pro read).

### 2. Agregar campo `description` a `treatment_types`

La tabla ya existe pero no tiene descripcion. Se agrega:

```text
ALTER TABLE treatment_types ADD COLUMN description text;
```

### 3. Actualizar RPCs de citas

Modificar `validate_and_create_appointment` y `validate_and_update_appointment` para verificar que el profesional tenga el tratamiento asignado en `practitioner_treatments` antes de crear/actualizar la cita. Si no hay registros en la tabla para ese profesional (profesional sin tratamientos asignados), se permite cualquier tratamiento (retrocompatibilidad).

## Cambios en Frontend

### 4. Nueva pagina: `src/pages/Treatments.tsx`

- Listado de tratamientos de la clinica (desde `treatment_types`)
- Cada tarjeta muestra: nombre, descripcion, duracion, color, y chips con los profesionales vinculados
- Boton "Nuevo Tratamiento" que abre un dialog
- Click en un tratamiento para editar (nombre, descripcion, profesionales asignados)
- Busqueda por nombre

### 5. Nuevos dialogs

- `NewTreatmentDialog`: formulario con nombre, descripcion, duracion en minutos y multi-select de profesionales
- `**EditTreatmentDialog**`: misma estructura, precargado con datos existentes

### 6. Hook: `src/hooks/useTreatments.ts`

Query a `treatment_types` con join a `practitioner_treatments` para traer los profesionales vinculados a cada tratamiento.

### 7. Navegacion

- Agregar ruta `/treatments` en `App.tsx`
- Agregar item "Tratamientos" en `AppSidebar.tsx` (debajo de Profesionales, icono `Stethoscope` o `ClipboardList`, roles: admin_clinic, tenant_owner, receptionist)
- Agregar en `BottomNav.tsx` si cabe, o dejarlo solo en sidebar

### 8. Validacion en dialogs de citas

En `NewAppointmentDialog` y `AppointmentDetailDialog`:

- Al seleccionar un profesional, filtrar el select de tratamientos para mostrar solo los que ese profesional tiene asignados (si tiene alguno; si no tiene ninguno asignado, mostrar todos -- retrocompatibilidad)
- Al seleccionar un tratamiento, si el profesional actual no lo tiene asignado, mostrar advertencia

### 9. Actualizar `treatmentLabel` y sistema de tipos

- El select de tratamientos en los dialogs de citas pasara a leer de la tabla `treatment_types` de la clinica en vez de usar el mapa hardcodeado
- Mantener retrocompatibilidad con los tratamientos ya existentes

## Secuencia de implementacion

1. Migracion DB (tabla + columna + RLS)
2. Actualizar RPCs con validacion profesional-tratamiento
3. Hook `useTreatments`
4. Pagina Treatments + dialogs
5. Navegacion (sidebar, rutas)
6. Filtrado de tratamientos en dialogs de citas segun profesional