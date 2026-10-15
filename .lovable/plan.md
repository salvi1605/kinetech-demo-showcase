# Fase 2 — Corrección de la página Configuración

Alcance: solo preview y Clínica Demo (5de1222f-…). No se tocan datos de CTAK. Nada se publica sin QA independiente y OK explícito de Salvi. El plan de «Sesión cobrada» sigue en pausa y es independiente.

---

## 1) «Borrar datos demo» — hacerlo seguro (prioridad máxima)

**Problemas actuales**
- Busca la clínica por **nombre** («Clínica Demo»). Si alguien renombra una clínica real con ese nombre, la borraría.
- Borra desde el navegador, tabla por tabla. Si una parte falla (por permisos o por datos relacionados), igual puede mostrar «Datos demo eliminados»: **falso éxito**.
- No borra historias clínicas, documentos ni archivos guardados, ni excepciones, horarios, auditoría o registros de envíos. Quedan datos huérfanos.
- La sección la ve cualquier administrador o dueño de clínica.

**Qué se hará**
1. **Marca permanente de clínica demo**: nueva columna `is_demo` (sí/no, por defecto «no») en clínicas. Se marca solo la Clínica Demo actual (por su ID, no por nombre). Ningún usuario puede cambiar esta marca desde la app; solo super_admin vía función protegida.
2. **Borrado en el servidor, en una sola operación**: nueva función de base de datos `purge_demo_clinic(clinic_id)` que:
   - Solo la puede ejecutar un super_admin.
   - Rechaza el pedido si la clínica no tiene `is_demo = true` (el nombre no importa).
   - Borra en orden todos los datos de esa clínica: turnos, historias clínicas y sus versiones, documentos (registros), pacientes, profesionales y sus horarios/tratamientos, excepciones, configuración y roles.
   - Todo o nada: si algo falla, no se borra nada y se informa el error real.
   - Devuelve la cantidad real de registros borrados por tipo.
3. **Archivos de documentos**: una función del servidor (con verificación de super_admin e `is_demo`) borra primero los archivos guardados de esa clínica y luego llama a `purge_demo_clinic`.
4. **Decisión a confirmar**: ¿borrar la Clínica Demo entera o solo **vaciarla** (conservar la clínica y su ID para seguir usándola en ventas)? Propuesta: **vaciarla**, porque el ID 5de1222f-… se usa para QA y demos.
5. **«Cargar datos demo»** también pasa a buscar la clínica por `is_demo`, no por nombre.
6. **Confirmación más fuerte**: el diálogo exige escribir el nombre de la clínica demo antes de habilitar «Borrar», y muestra qué se va a eliminar.
7. Mensajes honestos: éxito solo si el servidor confirma; si no, error con el motivo.

**Por qué**: el riesgo hoy es borrar datos de pacientes reales de forma irreversible. La marca `is_demo` más la validación en el servidor hacen imposible que este botón toque una clínica real, aunque se cambie el nombre o alguien llame la función directamente.

---

## 2) «Exportar datos» — corregir el comportamiento engañoso

**Problema**: dice «Descargar backup completo en JSON», pero copia al portapapeles datos personales de pacientes que estaban en memoria (incompletos y sin control). El portapapeles es un lugar inseguro para datos de salud.

**Qué se hará**
- Eliminar la copia al portapapeles.
- El botón usará la exportación real que ya existe en «Configuración de clínica» (función del servidor `export-clinic-data`, filtrada por clínica y con verificación de rol), y **descargará un archivo** `.json`.
- Diálogo de confirmación previo: «El archivo contiene datos personales y de salud de los pacientes. Guárdalo en un lugar seguro.»
- Texto corregido: «Descargar una copia de los datos de esta clínica (JSON)».
- Solo para administración y dueño de la clínica activa.

**Por qué**: la acción debe hacer exactamente lo que dice, usar una sola fuente de verdad para exportar y no exponer datos sensibles por el portapapeles.

---

## 3) Preferencias que no tienen efecto

| Preferencia | Propuesta | Por qué |
|---|---|---|
| Notificaciones por email | **Eliminar** | La regla del producto prohíbe envíos automáticos; no hay notificaciones que recibir. Mantenerla promete algo que no existe. |
| Notificaciones push | **Eliminar** | No hay infraestructura de notificaciones push; sería un proyecto aparte. |
| Tema oscuro | **Eliminar por ahora** | Implementarlo bien exige revisar contraste en toda la app (calendario, colores de profesionales, reportes). Se puede retomar como proyecto propio. |
| Vista compacta | **Eliminar** | No hay diseño definido de «vista compacta»; el calendario ya tiene alturas fijas aprobadas. |

- Las columnas de la base se mantienen (cambio no destructivo) y se marcan como «en desuso».
- La tarjeta queda como «Mi cuenta» con «Cambiar contraseña».
- Si prefieres implementar el tema oscuro en lugar de quitarlo, lo armo como plan separado.

**Por qué**: un interruptor que no hace nada genera desconfianza y tickets de soporte.

---

## 4) «Modo mantenimiento», «Backups automáticos», «Logs de auditoría»

Hoy son interruptores sin conexión con nada (dos aparecen encendidos por defecto).

- **Modo mantenimiento → eliminar.** Bloquear la app es una decisión de plataforma, no de cada clínica; un administrador de clínica no debe poder hacerlo.
- **Backups automáticos → reemplazar por información de solo lectura**: «Respaldo diario automático: activo» con la fecha del último respaldo de la clínica (los respaldos diarios ya existen en el servidor). No se puede apagar desde la clínica.
- **Logs de auditoría → reemplazar por información de solo lectura**: «El registro de cambios en turnos está siempre activo». Apagarlo no debe ser posible por razones legales y de trazabilidad.
- La tarjeta pasa a llamarse «Seguridad y respaldos».

**Por qué**: lo que existe se muestra con su estado real; lo que no debe ser configurable por la clínica deja de aparentar serlo.

---

## 5) «Limpiar caché»

**Propuesta: eliminarlo.** La app no guarda datos de pacientes en caché local que un usuario necesite borrar; los datos se recargan del servidor. Implementarlo de verdad (vaciar almacenamiento y recargar) podría cerrar la sesión o perder borradores sin beneficio claro.

**Por qué**: hoy muestra «Caché limpiado» sin hacer nada (falso éxito).

---

## 6) «Descargar Schema SQL»

**Propuesta: eliminarlo de Configuración.** El archivo está escrito a mano y desactualizado; además, la estructura de la base no es útil para una clínica y no sirve como respaldo (no contiene datos). El respaldo real es la exportación del punto 2.
- Se eliminan el botón y los archivos que lo generan.

**Por qué**: un «respaldo» que no respalda y está desactualizado es engañoso; mantenerlo sincronizado a mano no tiene sentido.

---

## 7) Etiqueta «UI-Only» en Estadísticas

Los números (pacientes, profesionales, turnos) son reales y vienen de la base de la clínica activa.
- Quitar «UI-Only» y mostrar «Clínica activa: {nombre}».
- Mostrar «Cargando…» mientras llegan y un mensaje si fallan, en lugar de «0».

**Por qué**: la etiqueta dice lo contrario de la realidad.

---

## 8) Sección «Demo (interno)» solo para super_admin

- Visible solo para super_admin (sin simulación de rol activa), no para administración ni dueño.
- La restricción también está en el servidor (punto 1), así que no basta con ocultarla.
- Badge «Solo super admin» en lugar de «Admin Only».

**Por qué**: es una herramienta interna de ventas/QA con capacidad de borrar datos; las clínicas clientas no deben verla.

---

## Resultado final de la página

```text
Configuración
├─ Mi cuenta (todos)                 → Cambiar contraseña
├─ Gestión de usuarios (admin/dueño) → sin cambios
├─ Seguridad y respaldos (admin/dueño) → info real de respaldo y auditoría
├─ Datos de la clínica (admin/dueño) → Exportar (descarga), Estadísticas
└─ Demo (interno) (solo super_admin) → Cargar / Vaciar Clínica Demo
```

## QA (solo Clínica Demo)
- Intentar vaciar una clínica sin `is_demo` (también renombrada «Clínica Demo») → debe rechazarse.
- Vaciar la Clínica Demo → confirmar en la base que no quedan turnos, pacientes, historias, documentos ni archivos de esa clínica, y que otras clínicas no cambiaron.
- Forzar un error → no se borra nada y se muestra el error.
- Exportar como admin → se descarga el archivo; nada en el portapapeles.
- Ver Configuración como admin, dueño, recepción, profesional y super_admin → cada uno ve solo lo que le corresponde.
- Capturas de cada vista para tu revisión. Nada se publica.

## Decisiones que necesito de ti
1. Clínica Demo: ¿**vaciarla** (propuesto) o borrarla entera?
2. Tema oscuro: ¿eliminar ahora (propuesto) o planificarlo como proyecto aparte?

## Detalles técnicos
- Migración aditiva: `clinics.is_demo boolean not null default false`; RPC `purge_demo_clinic(uuid)` SECURITY DEFINER con `is_super_admin()` + `is_demo`, transaccional, devuelve conteos en JSON; RPC/flag no editables por RLS (trigger que impide cambiar `is_demo` salvo super_admin). Revertible: drop de función y columna.
- Edge function `purge-demo-clinic`: verifica JWT y super_admin, borra objetos de storage bajo el prefijo de la clínica, luego llama la RPC.
- `demoDataService.ts`: búsqueda por `is_demo`; elimina el borrado desde el cliente.
- `Settings.tsx`: refactor en tarjetas; export reutiliza `export-clinic-data` (extraer helper compartido con `ClinicSettings.tsx`); RoleGuard/`effectiveIsSuperAdmin` para Demo.
- Eliminar `src/utils/downloadSchema.ts` y `src/lib/databaseSchema.ts` (verificar que nada más los use). `db/schema.sql` se deja (no es parte de la UI).
- `user_preferences`: columnas sin uso marcadas con COMMENT «DEPRECATED»; `useUserPreferences` se simplifica o se elimina si queda sin uso.
- Fecha del último respaldo: lectura de la lista de respaldos de la clínica (o tabla de registro si existe).
