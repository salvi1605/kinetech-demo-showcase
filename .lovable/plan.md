

## Asignar roles adicionales a Thelma y Gerardo

### Datos actuales
- **Thelma** (id: `39d980cc-...`) → tiene `tenant_owner` en clínica `b95d96b5-...`
- **Gerardo** (id: `e8903c31-...`) → tiene `admin_clinic` en clínica `b95d96b5-...`

### Cambios a realizar

**Insertar 2 nuevos registros en `user_roles`:**

1. Thelma + `health_pro` (se mostrará como "Profesional de la salud" / "Kinesiólogo" en el selector)
2. Gerardo + `receptionist` (se mostrará como "Recepcionista" en el selector)

Ambos en la misma clínica `b95d96b5-c3fd-47ea-ab1a-7e9d171ca48f`.

### Sobre la etiqueta "Kinesiólogo"
La tabla `roles` tiene `description = 'Profesional de la salud'` para `health_pro`. Necesito revisar cómo `SelectClinic.tsx` muestra los nombres de rol para decidir si usar la descripción de la tabla o mapear a un label más amigable como "Kinesiólogo".

### Archivos
| Cambio | Detalle |
|---|---|
| INSERT en `user_roles` | 2 registros nuevos (Thelma → health_pro, Gerardo → receptionist) |
| Posible ajuste en `SelectClinic.tsx` | Mapear `health_pro` → "Kinesiólogo" en los botones de selección de rol |

