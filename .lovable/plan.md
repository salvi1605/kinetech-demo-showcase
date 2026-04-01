

## Banner de historias pendientes estilo health_pro para admins

### Qué se quiere
Que los roles administrativos (admin_clinic, tenant_owner, super_admin) vean el **mismo estilo de banner expandible** que ven los health_pro — con la lista de pacientes pendientes agrupada por profesional y expandible inline — en lugar del banner azul actual que solo abre un Sheet lateral.

### Cambio

**Archivo: `src/components/calendar/PendingNotesAdminBanner.tsx`**

Reemplazar la UI actual (botón azul → Sheet lateral con tabla) por un diseño tipo Collapsible similar al del health_pro, pero agrupado por profesional:

1. **Banner principal**: estilo similar al ámbar del health_pro pero en azul, con el conteo total de pendientes y chevron para expandir/colapsar.
2. **Contenido expandible**: en lugar de un Sheet, se despliega inline mostrando:
   - Una sección por cada profesional con pendientes (nombre + badge con conteo)
   - Debajo de cada profesional, la lista de pacientes pendientes (hora, nombre, tratamiento, botón "Ver")
   - Profesionales sin pendientes se muestran colapsados o con un check verde
3. **Mantener** el resumen de progreso (barra + porcentaje) en el banner principal
4. **Mantener** el estado "todas completadas" (banner verde con check)

Componentes a usar: `Collapsible` de shadcn (ya importado en el proyecto), misma estructura visual que `PendingNotesHealthProBanner`.

**Archivo: `src/pages/Calendar.tsx`**
Sin cambios — el admin banner ya se renderiza correctamente para los roles administrativos.

### Resultado
- Admins ven las historias pendientes agrupadas por profesional, expandibles inline
- Misma experiencia visual que los health_pro pero con visibilidad de todos los profesionales
- Sin necesidad de abrir un panel lateral — todo queda en contexto del calendario

