# Auto-asignación de roles, backfill, invisibilidad de super_admin y voseo

Solo preview. HOLD de publicación vigente. No se tocan pacientes, turnos ni datos de clínicas.

## Diagnóstico
- Las clínicas se crean por dos caminos: el RPC `super_admin_create_clinic` y un insert directo en `clinics` desde `CreateClinicDialog` (flujo no super_admin). Modificar solo el RPC dejaría afuera el segundo camino.
- Las listas de equipo de clínica (`useClinicUsers`, `UserManagement`, `UserManagementCard`, `useAvailableUsersForPractitioner`, `EditUserDialog`) leen `user_roles` sin excluir super_admin.
- «respondé» aparece en `src/utils/whatsapp.ts` (info del turno y próximos turnos).

## Pasos
1. **Trigger server-side** `AFTER INSERT ON clinics` (SECURITY DEFINER): busca `users.id` con email `salvi1605@gmail.com`; si no existe, no hace nada; si existe, inserta en `user_roles` un registro por cada fila de `roles` para la nueva clínica (`active=true`, `ON CONFLICT DO NOTHING`). Cubre ambos caminos de creación sin tocar el RPC. Los roles globales (`super_admin`, si su trigger `enforce_super_admin_global` exige `clinic_id` nulo) se insertan con la regla que ese trigger imponga, para no romper la creación.
2. **Backfill único** (solo inserts en `user_roles`): mismo cruce clínicas × roles para todas las clínicas existentes, incluida CTAK, con `ON CONFLICT DO NOTHING`.
3. **Invisibilidad**: función `is_platform_super_admin(user_id)` y filtro en las listas de equipo de clínica que excluya usuarios con `super_admin` activo, salvo cuando quien mira es super_admin (vistas de super admin intactas). `audit_log` no se modifica.
4. **Voseo**: «respondé» → «responde» en los dos mensajes.
5. **Verificación**: build OK; crear una clínica de prueba en preview y confirmar los roles asignados (y luego eliminarla, o dejarla si prefieres); contar filas del backfill por clínica.

## Puntos a confirmar antes de implementar
- **Acceso invisible a CTAK**: esta cuenta tendrá acceso completo a historias clínicas de todas las clínicas y no aparecerá en su lista de equipo. Esto es una decisión de privacidad/legal (datos de salud). Recomiendo que los Términos/Privacidad mencionen el acceso de soporte de la plataforma. ¿Confirmas?
- **Rol super_admin en la tabla roles**: si se asigna "todos los roles", incluye super_admin global. ¿Lo quieres incluido, o solo los roles de clínica?
- **Clínica de prueba**: ¿la creo en preview para verificar y la borro después? Tocaría la tabla de clínicas.

## Detalle técnico
- Migración: función `assign_platform_roles_to_clinic(_clinic_id uuid)` + trigger `trg_clinics_assign_platform_roles`; email en una constante dentro de la función (único lugar).
- Backfill vía SQL de datos (`INSERT ... SELECT ... ON CONFLICT DO NOTHING`), no en la migración.
- Filtro de UI en los hooks; RLS sin cambios.
