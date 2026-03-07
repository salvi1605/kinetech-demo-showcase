

# Plan: Implementar rol `super_admin` global

## Resumen

Crear un rol `super_admin` global (sin clinic_id) que puede acceder a todas las clínicas como admin, crear clínicas para nuevos clientes, y asignar/revocar super_admin a otros usuarios. Tu usuario (salvi1605@gmail.com, id: `f6157dc0-677c-4fd7-8441-bc424c4e5056`) queda protegido: nadie puede quitarle el rol super_admin. Adicionalmente, se bloquea `create_clinic_onboarding` para que usuarios nuevos no puedan crear clínicas por sí solos; solo super_admin puede crearlas.

---

## Cambios en base de datos (3 migraciones)

### Migración 1: Rol super_admin + user_roles nullable clinic_id
```sql
-- Insertar rol super_admin
INSERT INTO roles (id, description) VALUES ('super_admin', 'Administrador global del sistema');

-- Hacer clinic_id nullable (solo super_admin lo usa como NULL)
ALTER TABLE user_roles ALTER COLUMN clinic_id DROP NOT NULL;

-- Constraint: super_admin => clinic_id IS NULL, otros => clinic_id NOT NULL
ALTER TABLE user_roles ADD CONSTRAINT chk_super_admin_clinic
  CHECK (
    (role_id = 'super_admin' AND clinic_id IS NULL)
    OR (role_id <> 'super_admin' AND clinic_id IS NOT NULL)
  );

-- Seedear tu usuario como super_admin
INSERT INTO user_roles (user_id, clinic_id, role_id, active)
VALUES ('f6157dc0-677c-4fd7-8441-bc424c4e5056', NULL, 'super_admin', true);
```

### Migración 2: Funciones RLS + protección
```sql
-- Función is_super_admin()
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.role_id = 'super_admin'
      AND ur.active = true
  );
$$;

-- Actualizar is_admin_clinic para incluir super_admin
CREATE OR REPLACE FUNCTION public.is_admin_clinic(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.clinic_id = target_clinic_id
      AND ur.role_id IN ('admin_clinic', 'tenant_owner')
      AND ur.active = true
  );
$$;

-- Actualizar can_view_user para super_admin
CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE (
      is_super_admin()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id AND auth_user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur1
        JOIN public.users u ON ur1.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND ur1.role_id IN ('admin_clinic', 'tenant_owner')
        AND ur1.active = true
        AND EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = target_user_id AND ur2.clinic_id = ur1.clinic_id)
      )
    )
  END;
$$;

-- Actualizar clinics RLS para super_admin
DROP POLICY IF EXISTS clinics_admin_owner_full_access ON clinics;
CREATE POLICY clinics_admin_owner_full_access ON clinics FOR ALL
  TO authenticated USING (is_admin_clinic(id) OR is_super_admin());

-- RLS para user_roles: super_admin puede ver/gestionar todos
DROP POLICY IF EXISTS user_roles_admin_full_access ON user_roles;
CREATE POLICY user_roles_admin_full_access ON user_roles FOR ALL
  TO authenticated USING (is_super_admin() OR (clinic_id IS NOT NULL AND is_admin_clinic(clinic_id)));

-- Proteger tu usuario: trigger que impide eliminar/desactivar super_admin de salvi1605
CREATE OR REPLACE FUNCTION public.protect_root_super_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.role_id = 'super_admin' 
     AND OLD.user_id = 'f6157dc0-677c-4fd7-8441-bc424c4e5056'::uuid THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'No se puede eliminar el super_admin raíz del sistema';
    END IF;
    IF NEW.active = false THEN
      RAISE EXCEPTION 'No se puede desactivar el super_admin raíz del sistema';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_root_super_admin
  BEFORE UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION protect_root_super_admin();
```

### Migración 3: Bloquear create_clinic_onboarding + crear RPC para super_admin
```sql
-- Reemplazar create_clinic_onboarding para que NADIE pueda crear clínicas
CREATE OR REPLACE FUNCTION public.create_clinic_onboarding(...)
-- Agregar: RAISE EXCEPTION 'La creación de clínicas está deshabilitada. Contacte al administrador del sistema.';

-- Nueva RPC: super_admin_create_clinic
CREATE OR REPLACE FUNCTION public.super_admin_create_clinic(
  p_name text, p_country_code text, p_timezone text, p_currency text,
  p_owner_user_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
  -- Verificar que el caller es super_admin
  -- Crear clinic + clinic_settings
  -- Si p_owner_user_id provisto, asignar tenant_owner
  -- RETURN clinic_id
$$;
```

---

## Cambios en frontend

### 1. `AppContext.tsx` (tipo + bootstrap)
- Agregar `'super_admin'` a `UserRole`
- Agregar `isSuperAdmin: boolean` al `AppState`
- En `bootstrapUser`: detectar si el usuario tiene role `super_admin` (clinic_id IS NULL). Si es super_admin, marcar `isSuperAdmin = true` y no forzar redirección a create-clinic
- Bloquear `canCreateClinic` para todos los usuarios (ya no existe el self-onboarding)

### 2. `SelectClinic.tsx` (ver todas las clínicas)
- Si `state.isSuperAdmin`: consultar `clinics` directamente (SELECT * FROM clinics) en lugar de filtrar por user_roles
- Mostrar badge "Super Admin" en cada clinic card
- Agregar botón "Crear nueva clínica" (abre CreateClinicDialog modificado para usar `super_admin_create_clinic`)
- Al seleccionar una clínica, operar con rol `admin_clinic`

### 3. `AppSidebar.tsx` + `BottomNav.tsx`
- Agregar `'super_admin'` a todos los arrays de roles en navigation items (super_admin ve todo)

### 4. `RoleGuard.tsx` + `useUserRole.ts`
- Agregar `'super_admin'` al tipo y lógica de jerarquía

### 5. `AuthRouteGuard.tsx`
- Super_admin sin clinic seleccionada va a SelectClinic (no a create-clinic ni no-access)

### 6. `UserManagement.tsx`
- Si `state.isSuperAdmin`: mostrar sección para promover/revocar `super_admin` a otros usuarios
- Impedir revocar super_admin del usuario raíz (salvi1605@gmail.com) en el frontend tambien

### 7. `CreateClinicPage.tsx`
- Redirigir a /no-access siempre (ya no se usa para self-onboarding)
- O eliminarlo y usar solo el dialog desde SelectClinic

### 8. Edge functions (`create-user`)
- Permitir asignar `super_admin` si el caller es super_admin

---

## Reglas de protección

1. **Nivel BD**: Trigger `trg_protect_root_super_admin` impide DELETE o desactivar el super_admin de `salvi1605@gmail.com`
2. **Nivel frontend**: UI no muestra botón de revocar para el usuario raíz
3. **Creación de clínicas**: Solo vía `super_admin_create_clinic` RPC, que valida `is_super_admin()`

