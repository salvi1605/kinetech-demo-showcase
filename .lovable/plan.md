
# Plan: Corregir Roles de Navegación y Asegurar Permisos por Rol

## Problema Identificado

El sidebar y la navegación móvil usan **nombres de roles incorrectos** que no coinciden con los roles reales de la base de datos:

| Usado en UI (incorrecto) | Rol real en BD |
|--------------------------|----------------|
| `'admin'`                | `'admin_clinic'` |
| `'recep'`                | `'receptionist'` |
| `'kinesio'`              | `'health_pro'` |

Esto causa que el **sidebar aparezca vacío** para receptionist y health_pro porque el filtro `item.roles.includes(state.userRole)` nunca encuentra coincidencia.

---

## Matriz de Permisos por Rol

### Navegación Principal

| Ruta | tenant_owner | admin_clinic | receptionist | health_pro |
|------|:------------:|:------------:|:------------:|:----------:|
| /calendar | Si | Si | Si | Si |
| /patients | Si | Si | Si | Si (solo asignados) |
| /practitioners | Si | Si | Si (solo ver) | No |
| /availability | Si | Si | No | Si (solo propia) |
| /exceptions | Si | Si | No | Si (solo propias) |
| /copy-schedule | Si | Si | No | No |

### Sistema/Administración

| Ruta | tenant_owner | admin_clinic | receptionist | health_pro |
|------|:------------:|:------------:|:------------:|:----------:|
| /users | Si | Si | No | No |
| /clinics | Si | Si | No | No |
| /settings | Si | Si | Si (limitado) | Si (limitado) |

### Acceso a Configuración por Rol

- **tenant_owner / admin_clinic**: Acceso completo (gestión de usuarios, datos, demo)
- **receptionist / health_pro**: Solo preferencias personales y cambio de contraseña

---

## Cambios Técnicos

### 1. Corregir AppSidebar.tsx

Actualizar los arrays `navigationItems` y `authItems` con los roles correctos:

```typescript
const navigationItems = [
  {
    title: 'Agenda',
    url: '/calendar',
    icon: Calendar,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'] as UserRole[],
  },
  {
    title: 'Pacientes',
    url: '/patients',
    icon: Users,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'] as UserRole[],
  },
  {
    title: 'Profesionales',
    url: '/practitioners',
    icon: UserCheck,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist'] as UserRole[],
  },
  {
    title: 'Disponibilidad',
    url: '/availability',
    icon: Clock,
    roles: ['admin_clinic', 'tenant_owner', 'health_pro'] as UserRole[],
  },
  {
    title: 'Excepciones',
    url: '/exceptions',
    icon: Calendar1,
    roles: ['admin_clinic', 'tenant_owner', 'health_pro'] as UserRole[],
  },
  {
    title: 'Copiar Horario',
    url: '/copy-schedule',
    icon: Copy,
    roles: ['admin_clinic', 'tenant_owner'] as UserRole[],
  },
];

const authItems = [
  {
    title: 'Usuarios',
    url: '/users',
    icon: Shield,
    roles: ['admin_clinic', 'tenant_owner'] as UserRole[],
  },
  {
    title: 'Clínicas',
    url: '/clinics',
    icon: Building2,
    roles: ['admin_clinic', 'tenant_owner'] as UserRole[],
  },
  {
    title: 'Configuración',
    url: '/settings',
    icon: Settings,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'] as UserRole[],
  },
];
```

### 2. Corregir BottomNav.tsx

Actualizar `mobileNavItems` con los mismos roles corregidos:

```typescript
const mobileNavItems = [
  {
    title: 'Agenda',
    url: '/calendar',
    icon: Calendar,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'],
  },
  {
    title: 'Pacientes',
    url: '/patients',
    icon: Users,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'],
  },
  {
    title: 'Profesionales',
    url: '/practitioners',
    icon: UserCheck,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist'],
  },
  {
    title: 'Disponibilidad',
    url: '/availability',
    icon: Clock,
    roles: ['admin_clinic', 'tenant_owner', 'health_pro'],
  },
  {
    title: 'Config',
    url: '/settings',
    icon: Settings,
    roles: ['admin_clinic', 'tenant_owner', 'receptionist', 'health_pro'],
  },
];
```

### 3. Actualizar Settings.tsx para Todos los Roles

Modificar la página de configuración para que:
- **Todos los roles** vean la sección de Preferencias UI (incluyendo cambio de contraseña)
- Solo **admin_clinic y tenant_owner** vean las secciones de gestión de usuarios, sistema y datos

La estructura actual ya es correcta - solo necesita asegurar que la ruta `/settings` sea accesible.

---

## Resumen de Acceso al Sidebar por Rol

### receptionist vera:
- Agenda
- Pacientes
- Profesionales
- Configuración (solo preferencias personales)

### health_pro vera:
- Agenda (solo sus citas)
- Pacientes (solo asignados)
- Disponibilidad (solo la suya)
- Configuración (solo preferencias personales)

### admin_clinic / tenant_owner veran:
- Todo el menú completo

---

## Archivos a Modificar

1. **`src/components/layout/AppSidebar.tsx`**
   - Corregir roles en `navigationItems`
   - Corregir roles en `authItems`

2. **`src/components/layout/BottomNav.tsx`**
   - Corregir roles en `mobileNavItems`

---

## Beneficios

- El sidebar mostrara las opciones correctas para cada rol
- receptionist podra ver y crear pacientes, gestionar agenda
- health_pro podra ver su agenda y pacientes asignados
- Todos los usuarios pueden cambiar su contraseña y configurar preferencias personales
- Coherencia entre los roles de BD y la UI
