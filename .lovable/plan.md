

## Auto-guardado silencioso de evoluciones clínicas

### Objetivo

Eliminar la pérdida de evoluciones cuando el usuario cierra el diálogo de Historia Clínica por cualquier vía (Cerrar, Esc, click fuera, refresh, cierre de pestaña, expiración de sesión). Sin modal de confirmación. Feedback no intrusivo vía toast.

### Causa raíz (confirmada en datos)

Solo el botón "Guardar Cambios" llama a `flushDrafts`. Las otras 3 vías de cierre (botón Cerrar, Esc, click-fuera) tiran los drafts. Esto explica las ≥18 notas con `body=''` y `updated_at = created_at` en las últimas 3 semanas para la clínica de Marianela. Caso Claudia Borgarelli encaja con el patrón.

La lógica de "pendiente" (`is_completed`), las RPCs y RLS están correctas — no se tocan.

---

## Cambios

### Archivo 1 — `src/components/patients/ClinicalHistoryBlock.tsx`

Modificar `useImperativeHandle` para que `flushDrafts` devuelva un resumen `{ attempted, succeeded, failed }` y solo persista drafts que **realmente cambiaron** respecto al texto guardado (evita writes redundantes que disparen `updated_at`).

```text
flushDrafts():
  toSave = entries cuyos drafts !== undefined && draft !== entry.text
  if toSave.length === 0 → return { attempted: 0, succeeded: 0, failed: 0 }
  results = Promise.allSettled( saveToDb(...) por cada uno )
  // saveToDb ya tiene su propio try/catch que escribe en localStorage ante error
  // Detectar fallos contando: rejected + claves clinical-draft-* que persistieron
  return { attempted, succeeded, failed }
```

Agregar un `useEffect` con listeners de `beforeunload` y `pagehide`:

```text
window.addEventListener('beforeunload', persistDraftsToLocalStorage)
window.addEventListener('pagehide',     persistDraftsToLocalStorage)
```

El handler recorre `entries` y, para cada draft que difiera del texto persistido, escribe `localStorage[clinical-draft-${appointmentId}] = { text, updatedAt }`. Esto cubre refresh, cierre de pestaña y expiración por inactividad.

> El mecanismo de **recuperación** ya existe en líneas 67–80 y 88–100: al abrir el diálogo se detectan drafts en localStorage, se cargan al state y se muestra un toast "Borrador pendiente". No requiere cambios.

### Archivo 2 — `src/components/patients/ClinicalHistoryDialog.tsx`

Reemplazar el handler `onOpenChange` del `<Dialog>` y el botón "Cerrar" para que TODA vía de cierre dispare auto-flush silencioso.

```text
const handleDialogOpenChange = async (nextOpen: boolean) => {
  if (nextOpen) {
    onOpenChange(true);
    return;
  }
  // Cerrando: auto-flush silencioso
  if (isFlushing) return;          // evita doble disparo
  setIsFlushing(true);
  try {
    const result = await historyBlockRef.current?.flushDrafts();
    if (result && result.attempted > 0) {
      if (result.failed === 0) {
        toast({ title: 'Guardado', description: `${result.succeeded} evolución(es) guardadas.` });
      } else if (result.succeeded > 0) {
        toast({
          title: 'Guardado parcial',
          description: `${result.succeeded} guardadas, ${result.failed} pendientes en este dispositivo. Se reintentarán al reabrir.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sin conexión',
          description: `${result.failed} evolución(es) guardadas localmente. Se sincronizarán al reabrir el historial.`,
          variant: 'destructive',
        });
      }
    }
  } catch (err) {
    console.error('[ClinicalHistoryDialog] flushDrafts error:', err);
  } finally {
    setIsFlushing(false);
    onOpenChange(false);            // siempre cerrar, no atrapar al usuario
  }
};
```

Aplicar:

```text
- <Dialog open={open} onOpenChange={onOpenChange}>
+ <Dialog open={open} onOpenChange={handleDialogOpenChange}>

- <Button variant="outline" onClick={handleClose}>Cerrar</Button>
+ <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isFlushing}>
+   {isFlushing ? 'Guardando…' : 'Cerrar'}
+ </Button>
```

`handleSaveAndClose` (botón "Guardar Cambios") queda igual — sigue mostrando el toast verde explícito de éxito.

`handleClose` se elimina (ya no se usa).

---

## Comportamiento resultante

| Vía de cierre | Antes | Después |
|---|---|---|
| Botón "Guardar Cambios" | Guarda + toast | Guarda + toast (sin cambios) |
| Botón "Cerrar" | Pierde draft | Guarda silenciosamente + toast "Guardado" |
| Tecla Esc | Pierde draft | Guarda silenciosamente + toast "Guardado" |
| Click fuera del diálogo | Pierde draft | Guarda silenciosamente + toast "Guardado" |
| Refresh de página | Pierde draft | `beforeunload` → localStorage → recupera al reabrir |
| Cierre de pestaña | Pierde draft | `pagehide` → localStorage → recupera al reabrir |
| Inactividad / logout | Pierde draft | `beforeunload` antes del unmount → localStorage |
| Sin conexión durante guardado | Pierde draft | `saveToDb` cae a localStorage + toast "Sin conexión" |

## Garantías

- **Cero modals** de confirmación. Cierre siempre se respeta.
- **Cero pérdida de texto**: si la BD falla, queda en localStorage por appointment.
- **Feedback no intrusivo**: solo toast cuando hubo escritura real (`attempted > 0`); cierre sin cambios = silencio total.
- **Sin cambios** en lógica de pendientes, RPCs, RLS, o datos históricos.
- **Sin re-escrituras espurias**: el diff `draft !== entry.text` evita guardar drafts no modificados (no se infla `updated_at`).

## Riesgos y mitigaciones

- **Doble flush si el usuario clickea Cerrar rápido dos veces**: `if (isFlushing) return` lo previene.
- **Click fuera accidental con texto a medio escribir**: ahora se guarda — comportamiento deseado, igual al patrón de Google Docs/Notion.
- **`beforeunload` puede ser bloqueado por algunos navegadores móviles**: por eso agregamos también `pagehide`, que es el canal recomendado en Safari iOS.

## Validación post-implementación

1. Abrir historia de un paciente con cita de hoy → escribir texto → cerrar con "X"/Esc/click-fuera → reabrir: el texto está en BD.
2. Escribir texto → desconectar red → cerrar → reconectar → reabrir: aparece toast "Borrador pendiente" y el texto está en el textarea (recuperado de localStorage).
3. Escribir texto → refrescar la pestaña sin cerrar → reabrir: el texto está en localStorage.
4. Sin cambios + cerrar: no aparece ningún toast.
5. Reportes y banner de "pendientes" siguen funcionando idénticos.

