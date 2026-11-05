# Fix del banner de historias pendientes — solo preview

## Diagnóstico confirmado
- `PendingNotesHealthProBanner.tsx` interpreta la ausencia de `practitionerId` como carga, aunque no se consulta nada.
- `Calendar.tsx` usa `RoleGuard`, que también permite el paso de `super_admin`; por eso no garantiza que el banner profesional se monte exclusivamente para `health_pro`.
- `usePendingClinicalNotes.ts` no invalida las consultas anteriores: una respuesta tardía puede reemplazar datos o apagar la carga de una consulta más reciente.

## Cambios
1. **Banner profesional:** devolver `null` cuando falta `practitionerId`, manteniendo el orden de los hooks. Mostrar el texto actual de carga únicamente con profesional identificado e `isLoading` activo.
2. **Agenda:** añadir una condición explícita `state.userRole === 'health_pro'` al montaje del banner profesional. Mantener intactos `RoleGuard`, la resolución del profesional y el banner administrativo.
3. **Consultas:** invalidar solicitudes anteriores al cambiar fecha, clínica o profesional y al desmontar; solo la solicitud vigente podrá actualizar resultados o carga. Reiniciar resultados del contexto anterior para evitar mostrar otra semana. Conservar los filtros y cálculos existentes, incluido el uso administrativo sin filtro de profesional.
4. **Verificación:** cubrir profesional ausente, roles distintos de `health_pro`, respuestas fuera de orden, cambio de contexto y desmontaje con pruebas pequeñas. Comprobar el preview y los errores de compilación; si la sesión disponible no permite entrar a la clínica demo, indicar esa limitación sin alterar usuarios ni datos.
5. Registrar los archivos modificados y guardar el cambio en el repositorio. **No publicar a producción ni modificar el backend.**

## Alcance técnico
Archivos funcionales: `src/components/calendar/PendingNotesHealthProBanner.tsx`, `src/pages/Calendar.tsx` y `src/hooks/usePendingClinicalNotes.ts`; pruebas de regresión y documentación interna correspondientes.

No se modifica la lógica de guardado de historias clínicas, turnos, permisos ni textos visibles.