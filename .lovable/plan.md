

## Plan: Banner de historias clínicas pendientes en el Calendario

### Resumen

Crear dos componentes banner en la vista del calendario:

1. **Banner para `health_pro`**: muestra cuántas evoluciones del día le faltan por completar, con botón para ir directo al paciente.
2. **Banner para admins** (`admin_clinic`, `tenant_owner`, `super_admin`): muestra el total de evoluciones pendientes del día (todos los profesionales), y al hacer clic abre un detalle desglosado por profesional.

---

### Componentes nuevos

**1. `src/components/calendar/PendingNotesHealthProBanner.tsx`**
- Hook interno que consulta `patient_clinical_notes` filtrado por `practitioner_id = current user's practitioner`, `note_date = fecha seleccionada`, `note_type = 'evolution'`, `is_completed = false`, `status = 'active'`.
- Muestra: "Te quedan **X** historias por completar hoy"
- Lista compacta (colapsable) con nombre del paciente, hora, y botón para navegar a `/patients/{id}` (tab clínico).
- Si todo está completo: badge verde "✓ Historias al día".

**2. `src/components/calendar/PendingNotesAdminBanner.tsx`**
- Consulta `patient_clinical_notes` + join con `practitioners` para la fecha seleccionada, agrupando por profesional.
- Muestra: "**X** historias pendientes hoy (todos los profesionales)" con ícono clickeable.
- Al hacer clic, abre un `Sheet` o `Dialog` con tabla:
  - Columnas: Profesional | Pacientes atendidos | Historias completadas | Pendientes
  - Cada fila con barra de progreso visual.

**3. `src/hooks/usePendingClinicalNotes.ts`**
- Hook reutilizable que recibe `clinicId`, `date`, y opcionalmente `practitionerId`.
- Retorna: `{ total, completed, pending, byPractitioner: Array<{ practitionerId, name, total, completed, pending }> }`.
- Consulta directa a `patient_clinical_notes` con filtros de fecha y tipo.

---

### Integración en Calendar.tsx

- Importar ambos banners.
- Renderizar `PendingNotesHealthProBanner` dentro de `RoleGuard` con `allowedRoles={['health_pro']}`.
- Renderizar `PendingNotesAdminBanner` dentro de `RoleGuard` con `allowedRoles={['admin_clinic', 'tenant_owner']}`.
- Ubicación: justo encima del grid del calendario, debajo del navegador de semana.
- En mobile: banners compactos (una línea con badge numérico, expandible con tap).

---

### Diseño visual

- **Health Pro**: fondo `amber-50`, borde `amber-200`, ícono `ClipboardList`. Colapsa en mobile a una sola línea.
- **Admin**: fondo `blue-50`, borde `blue-200`, ícono `BarChart3`. Click abre Sheet lateral con la tabla de desglose.
- Badge verde cuando todo está completo (0 pendientes).

---

### Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `src/hooks/usePendingClinicalNotes.ts` | Crear |
| `src/components/calendar/PendingNotesHealthProBanner.tsx` | Crear |
| `src/components/calendar/PendingNotesAdminBanner.tsx` | Crear |
| `src/pages/Calendar.tsx` | Modificar (agregar banners) |

No requiere cambios en la base de datos — usa tablas y datos existentes (`patient_clinical_notes`, `practitioners`, `appointments`).

