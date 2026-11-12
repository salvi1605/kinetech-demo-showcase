# Plan: el inicio de sesión no debe expulsar al usuario por el paso de perfil

## 1. Diagnóstico (causa raíz)

**Qué hace hoy el paso `ensure-public-user`** (se ejecuta en cada inicio de sesión y en cada recarga):
- Guarda el perfil con un "upsert" **por email**, con el email tal como viene del login, sin pasarlo a minúsculas.
- La tabla de perfiles tiene dos reglas de unicidad: por email y por cuenta de acceso (`auth_user_id`).
- Si el perfil guardado tiene el email distinto al del login (por ejemplo `Juan@Gmail.com` contra `juan@gmail.com`, o un email cambiado a medias), el upsert no encuentra coincidencia por email, intenta **crear un perfil nuevo** y choca con la regla de "una cuenta, un perfil": error de duplicado.
- En la app, si ese paso falla, se reintenta una vez y después se **cierra la sesión** y se manda a "sesión cerrada". Como el perfil sigue igual, cada intento posterior falla igual: el usuario queda afuera para siempre.

**Cómo se llega a un email distinto** (confirmado en el código):
- Alta de usuario (`create-user`, diálogo "Nuevo usuario"): guarda el email del perfil tal como se escribe. El sistema de acceso lo guarda siempre en minúsculas. Basta con que un administrador escriba una mayúscula.
- Edición de usuario (`update-user`): cambia primero el email del perfil y después el de acceso, sin revisar si este segundo paso falló. Si falla, quedan distintos.
- El proceso que vincula perfiles preexistentes (`sync_auth_user`) también compara el email de forma exacta.

**Segunda vía, menor:** en el primer inicio de sesión la app lanza este paso dos veces casi a la vez. Si el perfil todavía no existe, uno de los dos puede chocar con el otro y dar el mismo error de duplicado. En ese caso el reintento sí funciona, así que no deja al usuario afuera.

**Hallazgo lateral:** hoy el paso pisa el nombre del perfil en cada inicio de sesión. Si no hay nombre en los datos de acceso, pone el email. 7 de los 15 perfiles tienen el email como nombre.

## 2. Qué cuentas sufrieron el error (requisito 4)

- **No pude ver el error en los registros.** Los registros de esta función que conserva el sistema solo muestran arranques y apagados, sin errores de duplicado. No puedo atribuir el aviso de Lovable a una cuenta concreta.
- **Hoy ninguna cuenta está en estado de bloqueo:** los 15 perfiles tienen el email igual al de acceso, todos en minúsculas, sin duplicados ni perfiles sin vincular.
- **Personal que inició sesión en las últimas 30 h y cuyo perfil se actualizó bien después del login** (o sea, el paso funcionó):
  - CTAK: telmaayastuy@gmail.com, marianela.arroyo@gmail.com, gerardovillar2014@gmail.com, mirianluciaarias@hotmail.com, acostamariavictoria5@gmail.com
  - Demo, CTAK y acceso global: salvi1605@gmail.com
  - Cuentas de prueba sin clínica ni roles (mailosaur.net): mn9mp, 7vcfo, 08maw y p71ul, creadas el 11/11 y el 12/11. Son primeros inicios de sesión, justo donde puede darse la segunda vía, la que se resuelve sola.
- En las últimas 48 h hubo 11 visitas a "sesión cerrada". Las de 13:25, 18:00 y 21:04 de hoy van seguidas, a los 8–9 segundos, de un inicio de sesión exitoso de una cuenta de CTAK. Encaja más con cierres por inactividad seguidos de un nuevo ingreso que con un bloqueo permanente.
- **Conclusión:** no hay evidencia de que alguien de CTAK haya quedado bloqueado. Si el error ocurrió, lo más probable es que fuera en los primeros ingresos de las cuentas de prueba. Aun así, el defecto es real y cualquier alta con una mayúscula lo dispara, así que conviene corregirlo.
- Para estas consultas solo leí emails de personal, sus clínicas y sus fechas. Ningún dato de pacientes.

## 3. Cambios propuestos

### A. Base de datos (migración reversible)
1. Nueva función interna `ensure_public_user(auth_user_id, email, full_name)`, que solo puede ejecutar el servidor (sin permiso para usuarios logueados ni anónimos). Hace todo en un solo paso y con bloqueo por cuenta, para que dos llamadas simultáneas no choquen:
   - Busca el perfil **por `auth_user_id`**. Si existe, actualiza el email (en minúsculas) si cambió. No crea otro perfil.
   - Si el nuevo email ya lo usa **otro** perfil: no toca nada, no falla y devuelve un aviso `email_conflict`. Nunca borra ni fusiona.
   - Si no hay perfil por cuenta, pero sí uno sin vincular con ese email (sin distinguir mayúsculas), lo vincula. Es el caso de usuarios dados de alta antes de su primer ingreso.
   - Si no hay nada, crea el perfil.
   - Nombre: solo se escribe al crear el perfil, o si el actual está vacío o es igual al email. Ya no se pisa un nombre real.
2. Regla automática en la tabla de perfiles: todo email que se guarde se pasa a minúsculas y sin espacios, venga de donde venga (alta, edición o login). Hoy los 15 perfiles ya cumplen, así que no cambia ningún dato existente.
3. `sync_auth_user` compara el email sin distinguir mayúsculas.
4. No se tocan `user_roles`, las reglas de seguridad de filas (RLS), las clínicas ni ningún perfil existente.

### B. Funciones del servidor
1. `ensure-public-user`: pasa el email a minúsculas y llama a la función nueva. La respuesta mantiene la misma forma, así que la versión de la app ya publicada sigue funcionando.
2. `create-user`: pasa el email a minúsculas antes de buscar, crear o comparar.
3. `update-user` (cambio de email): primero cambia el email de acceso. Si eso falla, devuelve el error y no toca el perfil. Si sale bien, actualiza el perfil (en minúsculas). Así no vuelven a quedar distintos.

### C. App
1. Saco el paso de perfil del arranque a un módulo pequeño (`src/lib/auth/ensurePublicUser.ts`):
   - Un reintento.
   - Renovación del acceso solo si el error es de autorización.
   - **Nunca cierra la sesión.** Si falla, se registra un aviso y el arranque sigue.
2. Si después de eso no se encuentra el perfil, en lugar de cerrar la sesión se muestra una pantalla "No pudimos preparar tu cuenta" con dos botones: **Reintentar** y **Cerrar sesión** (este último solo si el usuario lo elige). Va en tuteo neutro y con el estilo actual.
3. Siguen igual: los cierres por inactividad, por acceso vencido de verdad, el selector de clínica, el acceso global por email y la lógica de roles (incluido el super_admin invisible de salvi1605@gmail.com).

## 4. Verificación

1. **Reproducción con base descartable (requisito 5):** dentro de una transacción que se deshace al final (no queda ningún dato), creo un perfil de prueba `QA.Mayusculas@demo.test` vinculado a una cuenta ficticia:
   - El upsert actual con `qa.mayusculas@demo.test` da el error de duplicado. Eso confirma el bug.
   - La función nueva con el mismo caso no da error, conserva el mismo perfil y deja el email en minúsculas.
   - También pruebo: email cambiado, email ya tomado por otro perfil (sin cambios y sin error), perfil preexistente sin vincular, alta nueva y dos llamadas seguidas (sin duplicados).
2. **Reproducción real en la Clínica Demo:** tú (Muse) das de alta en la Demo un usuario de prueba con el email en mayúsculas, sin roles de CTAK. Con el código viejo quedaría bloqueado. Con el nuevo entra, y su perfil queda en minúsculas.
3. **Pruebas automáticas (vitest), que quedan en el proyecto:**
   - Si el paso de perfil falla, la sesión no se cierra.
   - El email se normaliza a minúsculas.
   - Con perfil inexistente, aparece la pantalla de "Reintentar" en lugar de "sesión cerrada".
4. **Control de salvi1605@gmail.com, antes y después:** mismo id de perfil y los mismos 21 roles activos (5 por rol de clínica más el super_admin global).
5. La compilación sin errores y todas las pruebas del proyecto pasan.
6. QA solo en la Clínica Demo. No pruebo nada con datos de CTAK.

## 5. Importante sobre "solo preview"

Esta app usa **una sola base de datos y las mismas funciones del servidor para la vista previa y la producción**. Por eso:
- **Lo que solo afecta a la vista previa:** el cambio de la app (C). Llega a producción recién cuando publiques.
- **Lo que queda activo en producción en cuanto se aplique:** la migración (A) y las funciones del servidor (B). Ya lo están usando las cuentas de CTAK. Están diseñadas para funcionar con la app ya publicada, y por sí solas ya eliminan el error de duplicado.

**Te propongo:**
- Paso 1: implemento C, las pruebas y la reproducción descartable. Nada de esto toca producción.
- Paso 2: solo con tu OK explícito, aplico A y B.
- Paso 3: publicar la app, cuando lo digas.

Dime si apruebas los pasos 1 y 2 juntos o por separado.

## Decisiones a confirmar
1. Dejar de pisar el nombre del perfil en cada inicio de sesión (recomendado). Los 7 perfiles que ya tienen el email como nombre no se corrigen solos.
2. Pantalla "No pudimos preparar tu cuenta" en lugar de "sesión cerrada" cuando falta el perfil.
3. ¿De dónde salen las cuentas de prueba mailosaur.net? ¿Son tuyas? No las toco.

## Detalle técnico
- Archivos: nueva migración; `supabase/functions/ensure-public-user/index.ts`, `create-user/index.ts`, `update-user/index.ts`; `src/contexts/AppContext.tsx`; nuevo `src/lib/auth/ensurePublicUser.ts` con su prueba; `src/components/shared/AuthRouteGuard.tsx` para la pantalla de reintento; regla nueva en `AGENTS.md`: perfiles por `auth_user_id`, email en minúsculas, el paso de perfil nunca cierra sesión.
- La función SQL usa `pg_advisory_xact_lock(hashtext(auth_user_id))`, `SECURITY DEFINER`, `search_path` fijo y `REVOKE EXECUTE` a `anon` y `authenticated`. Bajada: `DROP FUNCTION`, quitar el trigger y restaurar el cuerpo anterior de `sync_auth_user`.
- La regla de unicidad del email se mantiene. Con todos los emails normalizados, ya no distingue mayúsculas en la práctica.
