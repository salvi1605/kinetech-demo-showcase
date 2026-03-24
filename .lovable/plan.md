

# Fix: Marianela no ve el horario completo — falta política RLS en clinic_settings

## Problema
La tabla `clinic_settings` solo tiene una política RLS para `admin_clinic` / `tenant_owner` / `super_admin` (vía `is_admin_clinic`). No hay política SELECT para roles `receptionist` ni `health_pro`.

Cuando Marianela (recepcionista) carga el calendario, la query a `clinic_settings` falla silenciosamente por RLS. El hook `useClinicSettings` cae al fallback hardcodeado con `workday_start: 08:00:00` en vez de leer el `07:00:00` configurado en la base de datos.

## Solución
Agregar una política RLS de SELECT en `clinic_settings` para que recepcionistas y profesionales de salud puedan leer la configuración de su clínica.

## Cambio — migración SQL única

```sql
CREATE POLICY "clinic_settings_staff_read"
ON public.clinic_settings
FOR SELECT
TO authenticated
USING (
  is_receptionist(clinic_id) OR is_health_pro(clinic_id)
);
```

## Archivos modificados
- Solo una migración SQL (no se toca código frontend)

## Resultado
Todos los roles (admin, receptionist, health_pro) podrán leer `clinic_settings`, y el calendario mostrará desde las 7:00 como está configurado.

