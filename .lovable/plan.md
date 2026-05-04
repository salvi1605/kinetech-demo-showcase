## Diagnóstico del reporte de Marianela

### 1. Verificación en base de datos (hecho)

Consulté la cita de **Rodríguez Rilo Laila** del **lunes 4 de mayo de 2026**:

- ID: `3319ba74-c6dd-42ee-b9ec-b4bc14cff640`
- `start_time` = **09:30:00** (correcto, coincide con lo que dice Marianela)
- `sub_slot` = 2
- Profesional: Lic. Mirian Arias
- Sin registros en `audit_log` → la cita **nunca cambió de hora** desde que se creó (30/03/2026).

Conclusión: **en la base de datos el dato es correcto (09:30)**. El problema no está en cómo se almacena la cita.

### 2. Auditoría del código de notificaciones

Busqué en todo el repo (`src/` y `supabase/functions/`) cualquier integración de envío automático a pacientes: WhatsApp, SMS, Twilio, recordatorios, mailers transaccionales, edge functions de notificación. Resultado:

- **No existe ninguna funcionalidad que envíe automáticamente la hora de la cita al paciente.**
- Las únicas edge functions son: `backup-clinic-data`, `create-user`, `update-user`, `ensure-public-user`, `export-clinic-data`, `send-contact-email` (formulario público de contacto). Ninguna toca pacientes ni citas.

### 3. Auditoría del código de "copiar horario"

Las únicas formas en que sale un horario hacia el portapapeles (que luego se pega manualmente en WhatsApp/SMS) son:

| Lugar | Función | Fuente de la hora |
|---|---|---|
| `AppointmentDetailDialog.tsx` línea 217 (Resumen del turno) | `handleCopyToClipboard` | `appointment.startTime` (ya normalizado a `HH:mm` desde BD) |
| `AppointmentDetailDialog.tsx` línea 362 ("Copiar todos los turnos del paciente") | `handleCopyAllPatientAppointments` | Lee `start_time` directo de BD (`09:30:00`) y lo pasa a `formatCopyLine` |
| `MassCreateAppointmentDialog.tsx` línea 264 ("Copiar seleccionados") | `handleCopySelected` | `slot.hour` viene del slot que el usuario eligió en la grilla |
| `formatCopyLine` (`src/utils/copyFormat.ts`) | Util compartida | Recibe `hhmm` ya formateado y lo concatena tal cual |

**Todos los caminos respetan `09:30`.** No hay redondeo, no hay resta de minutos, no hay conversión de timezone aplicada al campo `time`. La hora se pasa como string desde Postgres.

### 4. Hipótesis sobre el origen real del "9:00"

Como el sistema no envía nada automáticamente y la copia manual respeta la hora correcta, las hipótesis verosímiles son:

1. **Confusión visual en el calendario móvil**: Laila está en el bloque `09:30` pero en el bloque anterior (`09:00`) hay 2 pacientes (Myszkin sub_slot 2, Labake sub_slot 3). En vista móvil compacta (376px) las celdas son chicas; Marianela pudo haber leído la fila anterior y enviado "9:00" por WhatsApp manualmente.
2. **Confusión con cita histórica de la misma paciente**: Laila tuvo una cita el **27/04/2026 a las 09:00** (estado `no_show`). Si Marianela escribió el mensaje mirando un historial viejo, pudo confundirse de fila.
3. **Error de tipeo manual** al redactar el WhatsApp.

Lo que **descartamos con certeza**:
- Bug en el guardado (BD tiene 09:30).
- Bug en el redondeo del slot (la cita ocupa el bloque 09:30 correctamente).
- Bug en notificación automática (no existe tal funcionalidad).
- Cambio fantasma de hora (el `audit_log` está vacío para esta cita).

### 5. Pregunta a confirmar con Marianela antes de tocar código

Para no proponer una solución que no resuelve el problema real, necesito que Marianela aclare **cómo le llegó el horario a la paciente**:

- ¿El mensaje lo escribió ella manualmente (WhatsApp/SMS)?
- ¿Usó el botón **"Copiar"** del detalle del turno y luego lo pegó? Si sí, ¿qué texto exacto se copió? (importante: si dice "09:30" en el copiado pero ella escribió "9:00" en WhatsApp, es error humano)
- ¿La paciente recibió un mensaje generado por **otro sistema** (recordatorio externo, Google Calendar, agenda compartida, etc.)?

### 6. Acción mínima propuesta (sólo si confirma que copió y pegó)

Si Marianela confirma que utilizó el botón de copiar y aún así apareció "9:00", hacemos:

- Agregar `console.log` temporal en `handleCopyAllPatientAppointments` y `handleCopyToClipboard` para registrar el texto exacto que va al portapapeles. Le pedimos a Marianela que reproduzca el copiado con otra paciente y nos manda screenshot del log + del mensaje pegado en WhatsApp. Eso permitirá decidir si hay bug o es error humano.

**No se propone ningún cambio funcional ahora** porque la evidencia indica que el bug no está en el sistema.

---

¿Confirmamos primero con Marianela cómo envió el mensaje antes de modificar código?