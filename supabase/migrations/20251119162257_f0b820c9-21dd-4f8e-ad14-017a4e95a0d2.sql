BEGIN;

-- 1) Crear clínica demo si aún no existe
INSERT INTO public.clinics (id, name, country_code, timezone, default_locale, default_currency, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Clínica Demo',
  'AR',
  'America/Argentina/Buenos_Aires',
  'es',
  NULL,
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinics c WHERE c.name = 'Clínica Demo'
);

-- 2) Crear o actualizar mi usuario en public.users
-- Se usa el email como clave única, auth_user_id se puede actualizar después del primer login
INSERT INTO public.users (id, auth_user_id, email, full_name, phone, locale, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  NULL, -- Se actualizará automáticamente en el primer login si tienes un trigger configurado
  'salvadorhdelgadok@gmail.com',
  'Salvador Delgado',
  NULL,
  'es',
  true,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE
SET
  full_name   = EXCLUDED.full_name,
  is_active   = true,
  updated_at  = now();

-- 3) Vincularme como admin_clinic de "Clínica Demo" en user_roles
INSERT INTO public.user_roles (id, user_id, clinic_id, role_id, active, created_at)
SELECT
  gen_random_uuid(),
  u.id,
  c.id,
  'admin_clinic',
  true,
  now()
FROM public.users u
CROSS JOIN public.clinics c
WHERE u.email = 'salvadorhdelgadok@gmail.com'
  AND c.name = 'Clínica Demo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
      AND ur.clinic_id = c.id
      AND ur.role_id = 'admin_clinic'
  );

COMMIT;