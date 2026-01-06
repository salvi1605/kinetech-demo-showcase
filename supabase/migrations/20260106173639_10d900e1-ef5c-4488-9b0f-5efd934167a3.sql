-- Funcion RPC para onboarding de clinica con SECURITY DEFINER
-- Solo usuarios autenticados sin roles previos pueden crear su primera clinica

CREATE OR REPLACE FUNCTION public.create_clinic_onboarding(
  p_name TEXT,
  p_country_code TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  p_default_currency TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_user_id UUID;
  v_clinic_id UUID;
  v_has_roles BOOLEAN;
BEGIN
  -- 1. Obtener auth user id
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 2. Obtener user_id de public.users
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = v_auth_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en public.users';
  END IF;

  -- 3. Verificar que NO tiene roles (solo usuarios nuevos pueden crear clinica)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id
  ) INTO v_has_roles;

  IF v_has_roles THEN
    RAISE EXCEPTION 'Usuario ya tiene roles asignados. Solo usuarios nuevos pueden crear clinicas.';
  END IF;

  -- 4. Crear clinica
  INSERT INTO public.clinics (name, country_code, timezone, default_currency)
  VALUES (p_name, p_country_code, p_timezone, p_default_currency)
  RETURNING id INTO v_clinic_id;

  -- 5. Crear clinic_settings con valores por defecto
  INSERT INTO public.clinic_settings (
    clinic_id,
    min_slot_minutes,
    workday_start,
    workday_end,
    auto_mark_no_show,
    auto_mark_no_show_time,
    allow_professional_self_block
  ) VALUES (
    v_clinic_id,
    30,
    '08:00:00',
    '19:00:00',
    true,
    '00:00:00',
    true
  );

  -- 6. Asignar SOLO tenant_owner al usuario
  INSERT INTO public.user_roles (user_id, clinic_id, role_id, active)
  VALUES (v_user_id, v_clinic_id, 'tenant_owner', true);

  RETURN v_clinic_id;
END;
$$;

-- Otorgar permisos de ejecucion a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.create_clinic_onboarding(TEXT, TEXT, TEXT, TEXT) TO authenticated;