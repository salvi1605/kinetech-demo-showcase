

# Gestión de usuarios y super admins en el Panel Super Admin

## Resumen
Agregar una sección de gestión de usuarios dentro del Panel Super Admin (`SuperAdminDashboard.tsx`) con dos capacidades:

1. **Gestión de Super Admins** — Listar super admins actuales, promover usuarios existentes a super_admin, revocar rol super_admin.
2. **Crear usuarios y asignarlos a clínicas** — Formulario para crear cualquier usuario con cualquier rol y asignarlo a una clínica específica (reutilizando la edge function `create-user` que ya soporta todos los roles incluyendo super_admin).

## Implementación

### Archivo: `src/pages/SuperAdminDashboard.tsx`

**Nuevo estado y lógica:**
- Estado para lista de super admins (query: `user_roles` con `role_id = 'super_admin'` + join `users`)
- Estado para lista de todos los usuarios del sistema
- Estado para lista de clínicas (ya se carga)
- Dialog para crear usuario (reutiliza la misma lógica que `UserManagement.tsx` pero con selector de clínica visible y todos los roles disponibles incluyendo `super_admin`)
- Dialog para promover usuario existente a super_admin
- Función para revocar super_admin (delete de `user_roles` donde `role_id = 'super_admin'`)

**Nueva sección visual** insertada debajo de las clínicas y actividad reciente:
- Card "Gestión de Usuarios" con dos tabs/subsecciones:
  - **Super Admins**: tabla con nombre, email y botón para revocar (protegido: no se puede revocar el root user `f6157dc0...`)
  - **Crear Usuario**: botón que abre dialog con formulario (email, contraseña, nombre, rol, clínica). Para `super_admin`, clínica es opcional/null.
- Botón "Promover a Super Admin" que muestra un select con usuarios existentes

**Acciones rápidas**: agregar botón "Gestionar usuarios" en la card de acciones rápidas existente.

### Edge function `create-user`
Ya soporta la creación de super_admin con `clinic_id: null`. No requiere cambios.

### Seguridad
- Solo visible si `state.isSuperAdmin` (ya verificado en el dashboard)
- La edge function ya valida que solo un super_admin pueda asignar `super_admin`
- El trigger `protect_root_super_admin` ya protege al usuario raíz contra revocación

### Archivos modificados
- `src/pages/SuperAdminDashboard.tsx` — agregar sección de gestión de usuarios con toda la lógica inline (sin crear componentes nuevos, usando Dialog, Table, Select, Input, Button existentes)

