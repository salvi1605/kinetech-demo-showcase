

# Plan: Exclusividad visual en calendario + Vista mobile mejorada

## Punto 3: Bloqueo visual de exclusividad en el calendario

### Situacion actual
- La validacion server-side YA FUNCIONA: el RPC `validate_and_create_appointment` retorna `EXCLUSIVE_CONFLICT` y el `NewAppointmentDialog` muestra el toast de error correctamente.
- El problema es puramente visual/UX en el calendario: cuando un tratamiento exclusivo ocupa un bloque horario, los demas sub-slots de ese bloque siguen apareciendo como "disponibles" (verdes con "+"), invitando al usuario a intentar agendar ahi.

### Solucion
Bloquear visualmente los sub-slots restantes cuando un tratamiento exclusivo ya ocupa el bloque:

1. **Funcion `isBlockedByExclusive`** en Calendar.tsx: dado un `dayIndex` + `time`, revisa si alguna cita existente en ese bloque tiene un `treatmentTypeId` que pertenece a `exclusiveTreatmentIds`. Si es asi, retorna `true`.

2. **Renderizado de sub-slots vacios**: en `renderSlot` (desktop) y en la vista mobile, antes de mostrar el boton verde "+", verificar `isBlockedByExclusive`. Si es true, mostrar un sub-slot deshabilitado (gris, icono candado/X) con tooltip "Bloqueado: tratamiento exclusivo en este horario".

3. **Multi-seleccion**: en `onSubSlotClick`, si el slot esta bloqueado por exclusividad, mostrar toast descriptivo y no agregar a la seleccion.

4. **Confirmacion masiva** (`confirmSelection`): agregar chequeo de exclusividad para los slots seleccionados contra citas ya existentes.

### Archivos a modificar
- `src/pages/Calendar.tsx`: agregar `isBlockedByExclusive()`, modificar renderizado de sub-slots vacios en desktop y mobile, agregar validacion en `onSubSlotClick`.

---

## Punto 7: Vista responsive mobile del calendario

### Situacion actual
- Ya existe vista mobile con Tabs por dia (Lun-Vie), swipe horizontal, sticky header, `WeekNavigatorCompact`, y `BottomNav`.
- Ya existe el componente `FloatingActionButton`.
- Falta: el FAB "+ Nuevo turno" no esta integrado en la pagina Calendar.

### Solucion

1. **FAB "+ Nuevo turno"** en Calendar mobile: agregar el `FloatingActionButton` con icono `Plus` que abre `NewAppointmentDialog` con el dia seleccionado como contexto. Solo visible en mobile (`lg:hidden` ya esta en el componente). Visible para roles `admin_clinic`, `tenant_owner`, `receptionist`.

2. **Ajuste de padding inferior**: asegurar que el contenido del calendario tenga suficiente padding-bottom para no quedar oculto detras del FAB + BottomNav.

### Archivos a modificar
- `src/pages/Calendar.tsx`: importar `FloatingActionButton`, agregar al final del componente con logica de apertura del modal de nuevo turno.

---

## Resumen tecnico

| Cambio | Archivo | Complejidad |
|--------|---------|-------------|
| Funcion `isBlockedByExclusive` | Calendar.tsx | Baja |
| Bloqueo visual sub-slots (desktop + mobile) | Calendar.tsx | Media |
| Validacion en `onSubSlotClick` | Calendar.tsx | Baja |
| FAB "+ Nuevo turno" en mobile | Calendar.tsx | Baja |

Todo se concentra en un unico archivo: `src/pages/Calendar.tsx`.
