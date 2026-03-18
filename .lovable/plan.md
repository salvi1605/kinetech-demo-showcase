

# Backups automáticos por clínica — Plan de implementación

## Arquitectura

```text
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  pg_cron     │────▶│  backup-clinic-data  │────▶│ Storage bucket  │
│  (diario)    │     │  (edge function)     │     │ clinic-backups  │
└─────────────┘     └──────┬───────────────┘     └─────────────────┘
                           │ import
                    ┌──────▼───────────────┐
                    │  _shared/            │
                    │  buildClinicExport() │
                    └──────▲───────────────┘
                           │ import
                    ┌──────┴───────────────┐
                    │  export-clinic-data  │◀──── UI (manual)
                    │  (edge function)     │
                    └──────────────────────┘
```

## Archivos a crear/modificar

### 1. `supabase/functions/_shared/buildClinicExport.ts` (nuevo)
- Extrae las líneas 108-175 del actual `export-clinic-data` a una función reutilizable
- Firma: `buildClinicExport(supabaseAdmin, clinic_id) → Promise<ExportPayload>`
- Misma lógica, misma sanitización, mismas exclusiones

### 2. `supabase/functions/export-clinic-data/index.ts` (refactor)
- Mantiene auth JWT + validación de roles exactamente igual
- Reemplaza la lógica de queries por `import { buildClinicExport } from '../_shared/buildClinicExport.ts'`
- Comportamiento externo idéntico

### 3. `supabase/functions/backup-clinic-data/index.ts` (nuevo)
- Autenticación server-to-server: valida un `Authorization: Bearer <BACKUP_SECRET>` leído desde `Deno.env.get('BACKUP_SECRET')`
- Obtiene todas las clínicas activas: `clinics.select('id, name').eq('is_active', true)`
- Itera cada clínica, llama `buildClinicExport()`, guarda en Storage
- Ruta: `{clinic_id}/{YYYY}/{MM}/{DD}/backup-{ISO timestamp}.json`
- Error en una clínica no detiene las demás
- Respuesta: `{ processed, succeeded, failed, details[] }`

### 4. `supabase/config.toml` — agregar:
```toml
[functions.backup-clinic-data]
verify_jwt = false
```

### 5. Migración SQL (bucket + cron)

**Bucket privado:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-backups', 'clinic-backups', false)
ON CONFLICT (id) DO NOTHING;
```

**Cron job** (ejecutado vía `supabase--read_query`, no migración, porque contiene secrets):
```sql
-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Job diario a las 03:00 UTC
SELECT cron.schedule(
  'backup-all-clinics-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qbavkycmdkugwzumidyy.supabase.co/functions/v1/backup-clinic-data',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <BACKUP_SECRET_VALUE>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### 6. Secret necesario
- `BACKUP_SECRET`: token aleatorio seguro para autenticar invocaciones server-to-server del cron. Se configura con `add_secret`.

## Seguridad
- Bucket `clinic-backups` es privado (no público)
- Sin políticas RLS de lectura pública — solo accesible via service role
- La edge function valida `BACKUP_SECRET` antes de ejecutar
- Misma sanitización de datos que la exportación manual (sin `file_url`, sin `auth_user_id`, campos de users limitados)
- `SUPABASE_SERVICE_ROLE_KEY` nunca expuesto al cliente

## No se modifica
- Schema de base de datos (sin tablas nuevas)
- UI existente
- Comportamiento de la exportación manual
- RLS policies existentes

## Resultado
- 1 módulo compartido nuevo (`_shared/buildClinicExport.ts`)
- 1 edge function nueva (`backup-clinic-data`)
- 1 edge function refactorizada (`export-clinic-data`) — mismo comportamiento
- 1 bucket privado (`clinic-backups`)
- 1 cron job diario (03:00 UTC)
- 1 secret nuevo (`BACKUP_SECRET`)

