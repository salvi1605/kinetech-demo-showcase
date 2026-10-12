# Corregir Reportes — solo preview

## Diagnóstico técnico
- **Acceso:** existen gates de `isPreviewEnv()` en `Reports.tsx`, `AppSidebar.tsx` y también `BottomNav.tsx`. Este último mantendría el bloqueo en la navegación móvil. `RoleGuard` ya contempla la herencia de super_admin, pero la consulta de profesionales se ejecuta antes del guard.
- **Métricas:** Operativo cuenta `completed` como «Asistieron» y todos los no cancelados como «Agendados». Productividad cuenta `completed + confirmed + scheduled` como «Atendidos»: **no incluye no-shows**, contrario a la descripción del pedido. Cambiar solo la etiqueta no resolvería esa diferencia.
- **Desglose:** no se calcula el número de programados. Además, `scheduled/confirmed` puede corresponder a hoy o a fechas pasadas, no únicamente al futuro.
- **Gráfico:** Cumplimiento tiene barras y tabla, **no una dona**. El único gráfico circular de distribución está en Tratamientos. La intermitencia aún no está reproducida; se comprobará antes de atribuirla a una causa.
- **Texto:** «No tenés acceso…» sí está presente. «Clínicas» y «Período» están correctamente codificados en los archivos revisados; falta contrastarlos con el texto visible.

## Implementación paso a paso
1. **Acceso administrativo**
   - Quitar los gates de entorno de la página, menú lateral y navegación móvil.
   - Mantener acceso exclusivo de admin_clinic, tenant_owner y super_admin, respetando la simulación de rol existente; negar health_pro y receptionist también por URL directa.
   - Ejecutar las consultas de Reportes únicamente dentro del contenido autorizado.
2. **Terminología consistente**
   - Usar «Completados» exclusivamente para completed, «No-shows» para no_show y «Total agendados» para todos los no cancelados.
   - En Productividad, mostrar Agendados y Completados por separado; actualizar títulos, leyendas, tabla y CSV.
   - Conservar las fórmulas de horas y promedios, pero nombrarlas según los estados que realmente incluyen; no presentar horas programadas como horas efectivamente trabajadas.
   - Unificar el porcentaje de no-shows sobre el total no cancelado y nombrar el porcentaje de completados explícitamente.
3. **Desglose conciliado**
   - Mostrar resumen, detalle por período y CSV con completados, no-shows y programados.
   - Separar «Programados (futuros)» de «Programados pendientes» si existen citas de hoy o pasadas, considerando fecha/hora de Buenos Aires.
   - Garantizar: **Completados + No-shows + Programados futuros + Programados pendientes = Total agendados**. Cancelados quedan fuera.
4. **Renderizado consistente**
   - Reproducir con sesión real las recargas, carga inicial y cambios de pestaña; revisar dimensiones del contenedor, montaje, animaciones y errores del gráfico circular existente.
   - Corregir la causa demostrada, asegurando dimensiones estables y estados claros de carga, vacío y error.
   - **Supuesto para validar:** el gráfico mencionado es el de distribución en Tratamientos; no agregar una dona nueva a Cumplimiento ni reemplazar sus barras. Si se trata de otro gráfico, una captura permitirá identificarlo.
5. **Texto y presentación**
   - Cambiar a «No tienes acceso a esta sección».
   - Corregir cadenas UTF-8 rotas que se detecten en Reportes o su navegación, sin reemplazos indiscriminados sobre datos de pacientes o clínicas.
   - Verificar escritorio, tablet y móvil de 360 px, preservando el diseño existente.

## Detalles técnicos y verificación
- Mantener React Query, componentes shadcn y consultas filtradas por clinic_id.
- Revisar políticas de lectura existentes sin modificarlas ni ampliar permisos: la protección de pantalla no sustituye RLS.
- Probar las métricas con casos controlados: 426 completados + 18 no-shows + 556 futuros = 1000, además de cancelados y programados pasados.
- Validar el flujo autenticado, filtros, recargas, cambio de pestañas y CSV; comprobar errores de compilación y navegador.
- La simulación de rol verifica visibilidad UI, no demuestra restricciones de base de datos; separar ambas comprobaciones y explicitar cualquier prueba no disponible.

## Fuera de alcance
- **Nada a producción:** el código quedará preparado para una futura publicación, pero no se publicará ahora.
- No modificar datos, estados de turnos, políticas de base, emails, recordatorios ni otras páginas.
