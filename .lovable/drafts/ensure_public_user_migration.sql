-- DRAFT for Step 2 (NOT applied). Profiles are keyed by auth_user_id; emails stored lower-case.
-- Down: DROP FUNCTION public.ensure_public_user(uuid, text, text);
--       DROP TRIGGER trg_users_normalize_email ON public.users; DROP FUNCTION public.fn_normalize_user_email();
--       restore previous public.sync_auth_user() body (exact email match).

CREATE OR REPLACE FUNCTION public.fn_normalize_user_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_normalize_email ON public.users;
CREATE TRIGGER trg_users_normalize_email
BEFORE INSERT OR UPDATE OF email ON public.users
FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_user_email();

CREATE OR REPLACE FUNCTION public.sync_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Link a pre-provisioned profile with the same email (case-insensitive)
  UPDATE public.users
  SET auth_user_id = NEW.id,
      updated_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND auth_user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.ensure_public_user(uuid, text, text);
CREATE FUNCTION public.ensure_public_user(p_auth_user_id uuid, p_email text, p_full_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name  text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_row   public.users%ROWTYPE;
  v_status text;
BEGIN
  IF p_auth_user_id IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'auth_user_id and email are required';
  END IF;

  -- Serialize concurrent calls for the same account (first-login race)
  PERFORM pg_advisory_xact_lock(hashtext('ensure_public_user:' || p_auth_user_id::text));

  -- 1) Existing profile for this account: update in place, never create another
  SELECT * INTO v_row FROM public.users WHERE auth_user_id = p_auth_user_id;
  IF FOUND THEN
    v_status := 'ok';
    IF v_row.email IS DISTINCT FROM v_email THEN
      IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email AND id <> v_row.id) THEN
        v_status := 'email_conflict';           -- another profile owns it: never merge
      ELSE
        UPDATE public.users SET email = v_email WHERE id = v_row.id;
        v_status := 'email_updated';
      END IF;
    END IF;
    UPDATE public.users
       SET full_name = CASE
             WHEN v_name IS NOT NULL AND (btrim(full_name) = '' OR lower(full_name) = lower(email))
             THEN v_name ELSE full_name END,
           updated_at = now()
     WHERE id = v_row.id
     RETURNING * INTO v_row;
    RETURN jsonb_build_object('status', v_status, 'id', v_row.id, 'email', v_row.email, 'full_name', v_row.full_name);
  END IF;

  -- 2) Pre-provisioned profile with this email and no account yet: link it
  SELECT * INTO v_row FROM public.users
   WHERE lower(email) = v_email AND auth_user_id IS NULL
   ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.users
       SET auth_user_id = p_auth_user_id,
           email = v_email,
           full_name = CASE
             WHEN v_name IS NOT NULL AND (btrim(full_name) = '' OR lower(full_name) = lower(email))
             THEN v_name ELSE full_name END,
           updated_at = now()
     WHERE id = v_row.id
     RETURNING * INTO v_row;
    RETURN jsonb_build_object('status', 'linked', 'id', v_row.id, 'email', v_row.email, 'full_name', v_row.full_name);
  END IF;

  -- 3) Email already owned by a different account: leave both untouched
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
    RETURN jsonb_build_object('status', 'email_owned_by_other_account', 'id', NULL, 'email', v_email, 'full_name', NULL);
  END IF;

  -- 4) New profile
  INSERT INTO public.users (auth_user_id, email, full_name)
  VALUES (p_auth_user_id, v_email, coalesce(v_name, v_email))
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.users WHERE auth_user_id = p_auth_user_id;
  END IF;
  RETURN jsonb_build_object('status', 'created', 'id', v_row.id, 'email', v_row.email, 'full_name', v_row.full_name);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_public_user(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_public_user(uuid, text, text) TO service_role;
