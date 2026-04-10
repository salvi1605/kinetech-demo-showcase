

## Selección de rol al iniciar sesión (sin cambio en sesión)

### Problema actual
1. `getUserRoleFromDB` usa `.single()` — falla si Thelma tiene 2 roles (`tenant_owner` + `health_pro`) en la misma clínica
2. El bootstrap auto-selecciona cuando hay 1 sola clínica, sin verificar si hay múltiples roles
3. `SelectClinic` muestra una card por cada entrada de `user_roles` (duplica la clínica si hay 2 roles)

### Flujo deseado

```text
Login → Bootstrap
  ├─ 1 clínica, 1 rol → auto-selecciona (sin cambios)
  ├─ 1 clínica, N roles → redirige a /select-clinic (elige rol)
  ├─ N clínicas → redirige a /select-clinic (elige clínica + rol)
  └─ Para cambiar de rol → cerrar sesión y volver a entrar
```

### Cambios

**1. `src/contexts/AppContext.tsx`**
- En `getUserRoleFromDB`: reemplazar `.single()` por array query. Si hay 1 resultado, auto-asignar. Si hay N, devolver el primero pero sin auto-seleccionar clínica.
- En bootstrap (`clinicsResult.clinics.length === 1`): contar roles distintos para esa clínica. Si hay más de 1 rol, NO auto-seleccionar — redirigir a `/select-clinic`.

**2. `src/pages/SelectClinic.tsx`**
- Agrupar entradas por `clinic_id`: una card por clínica
- Dentro de cada card, mostrar los roles disponibles como botones seleccionables (ej: "Propietario" | "Kinesiólogo")
- Al hacer click en un rol, se llama `handleSelectClinic(clinicId, clinicName, roleId)` — la lógica existente ya maneja esto correctamente
- Si la clínica solo tiene 1 rol, el botón se muestra directamente como "Seleccionar" (sin cambio visual respecto a hoy)

### Archivos
| Archivo | Cambio |
|---|---|
| `src/contexts/AppContext.tsx` | Bootstrap: detectar multi-rol, no auto-seleccionar si N roles en 1 clínica; `getUserRoleFromDB` sin `.single()` |
| `src/pages/SelectClinic.tsx` | Agrupar por clínica, mostrar botones de rol cuando hay más de uno |

### Resultado
- Thelma inicia sesión → ve su clínica con 2 botones: "Propietario" y "Kinesiólogo"
- Elige "Kinesiólogo" → entra con permisos de health_pro
- Para cambiar a "Propietario" → cierra sesión, vuelve a entrar, elige el otro rol
- Usuarios con 1 solo rol → experiencia idéntica a la actual

