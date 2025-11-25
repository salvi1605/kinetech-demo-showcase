-- Eliminar el duplicado más reciente
DELETE FROM public.user_roles 
WHERE id = 'f4354a97-3e43-4626-be2a-b2704f75b7ed';

-- Agregar restricción UNIQUE para prevenir duplicados
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_unique_user_clinic 
UNIQUE (user_id, clinic_id);