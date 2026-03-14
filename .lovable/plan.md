

# Exportación de datos por clínica

## Cambios

### 1. Edge Function: `supabase/functions/export-clinic-data/index.ts`
- Recibe `clinic_id` en el body JSON
- Extrae JWT del header Authorization, obtiene el auth user
- Valida que el usuario sea `admin_clinic`, `tenant_owner` o `super_admin` para esa clínica (consulta directa a `user_roles` + `users` con service role)
- Si no tiene permiso, retorna 403
- Consulta todas las tablas filtradas por `clinic_id` usando service role client:
  - `clinics` (registro único)
  - `clinic_settings`
  - `patients` (is_deleted = false; todos los campos)
  - `practitioners`
  - `practitioner_availability`
  - `treatment_types`
  - `practitioner_treatments`
  - `appointments`
  - `patient_clinical_notes`
  - `patient_documents` (solo: id, patient_id, file_type, description, uploaded_at, uploaded_by — sin file_url)
  - `schedule_exceptions`
  - `holiday_calendar`
  - `users`: solo id, full_name, email, phone, is_active, created_at (JOIN con user_roles para filtrar por clinic_id)
  - `user_roles` (filtrado por clinic_id): id, user_id, role_id, active, created_at
- Retorna JSON con `exported_at`, cada tabla como key, y `totals` con conteos
- Sigue el patrón CORS existente en create-user

### 2. Config: `supabase/config.toml`
```toml
[functions.export-clinic-data]
verify_jwt = false
```
(verify_jwt = false, validación manual en código como las demás functions)

### 3. Frontend: `src/pages/ClinicSettings.tsx`
- Agregar estado `isExporting`
- Agregar botón "Exportar datos" protegido con `RoleGuard` (`allowedRoles: ['admin_clinic', 'tenant_owner']`) — super_admin pasa automáticamente por RoleGuard
- Al hacer clic: llama `supabase.functions.invoke('export-clinic-data', { body: { clinic_id } })`
- Descarga el resultado como archivo `.json` con nombre `clinica-{nombre}-{fecha}.json`
- Toast de éxito/error y loading state en el botón
- Ubicación: debajo del EditClinicForm, en una Card separada "Exportar datos"

