

## Fix: Mostrar selección de roles para Super Admin en /select-clinic

### Problema
Como eres Super Admin, el sistema te envía directamente al dashboard de Super Admin sin pasar por la pantalla de selección de rol. Además, cuando un Super Admin visita `/select-clinic`, solo ve el rol "Super Admin" para cada clínica — no muestra los otros roles asignados (Propietario, Administrador, Kinesiólogo, Recepcionista).

### Cambios

**1. `src/pages/SelectClinic.tsx` — Cargar roles reales del Super Admin**
- En el bloque `if (state.isSuperAdmin)` (líneas 72-91): además de cargar todas las clínicas, también consultar `user_roles` del usuario para obtener sus roles específicos por clínica.
- Combinar: para cada clínica, mostrar "Super Admin" + los roles específicos que tenga asignados (ej: tenant_owner, health_pro, receptionist, admin_clinic).
- Resultado: cuando entres a `/select-clinic`, verás todos tus roles disponibles para la clínica.

**2. `src/pages/SuperAdminDashboard.tsx` — Botón para ir a seleccionar clínica con rol**
- Agregar un botón visible tipo "Entrar a una clínica" que navegue a `/select-clinic`, donde el usuario puede elegir clínica + rol específico.

### Resultado
- Inicias sesión → llegas al dashboard de Super Admin (como ahora)
- Desde ahí, clickeas "Entrar a una clínica" → ves tu clínica con 5 botones: Super Admin, Propietario, Administrador, Kinesiólogo, Recepcionista
- Eliges el rol con el que quieres operar → entras con esos permisos

### Archivos
| Archivo | Cambio |
|---|---|
| `src/pages/SelectClinic.tsx` | Cargar roles específicos del super admin además de "Super Admin" |
| `src/pages/SuperAdminDashboard.tsx` | Botón "Entrar a una clínica" → navega a /select-clinic |

