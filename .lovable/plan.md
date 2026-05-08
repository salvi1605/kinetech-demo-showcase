## Qué le está pasando a Marianela

En la pantalla **Editar Paciente**, cuando guarda desde las pestañas **Identificación** o **Emergencia** (no desde Seguro), el sistema le tira el toast genérico "No se pudo actualizar el paciente" y los cambios quedan sin guardar. Por eso ella los dejó "en borrador" — no es que no quisiera guardarlos, es que el botón **Guardar Cambios** no funciona en esas pestañas.

## Causa

El formulario carga la fecha de nacimiento en formato `DD-MM-YYYY` (formato visible para el usuario). Hay dos funciones de guardado:

- `handleSubmit` (botón de la pestaña **Seguro**): convierte la fecha a `YYYY-MM-DD` antes de mandarla a la base. ✅
- `handleGlobalSave` (botón en **Identificación** / **Emergencia**): manda la fecha tal cual, en `DD-MM-YYYY`. ❌

Postgres rechaza ese formato (`invalid input syntax for type date`), la operación falla y se muestra el error genérico. Esto explica al 100% lo que reporta Marianela con la paciente Levis Paula y por qué le pasó antes con otra y no se dio cuenta.

## Cambios a aplicar

**Archivo único:** `src/components/patients/EditPatientDialogV2.tsx`

1. **Función `handleGlobalSave`** — antes del `update`, convertir `dateOfBirth` igual que en `handleSubmit`:
   - Si viene en `DD-MM-YYYY` → reordenar a `YYYY-MM-DD`.
   - Si ya viene en `YYYY-MM-DD` (defensivo) → dejarlo igual.
   - Si viene vacío → `null`.
2. Reemplazar la línea `date_of_birth: normalizedForm.identificacion.dateOfBirth || null` por la variable convertida (`dobForDb`).
3. (Hardening menor) Mejorar el mensaje del toast de error para que muestre la causa real cuando exista (`error.message`), así si vuelve a fallar por otra razón no quedamos a ciegas.

No se tocan validaciones, ni el flujo de la pestaña Seguro, ni nada de la base de datos. Es un fix de una sola función en un solo archivo.

## Cómo verificar después

1. Abrir un paciente existente (ej. Levis Paula).
2. En la pestaña **Identificación**, cambiar cualquier campo (teléfono, nombre preferido).
3. Apretar **Guardar Cambios** → debe aparecer "Paciente actualizado" y cerrarse el diálogo.
4. Reabrir el paciente y confirmar que el cambio quedó persistido.
5. Repetir desde la pestaña **Emergencia**.
