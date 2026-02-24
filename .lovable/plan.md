
# Fix: Ocultar "No se encontraron pacientes" cuando ya hay paciente seleccionado

## Problema

Cuando seleccionas un paciente en el dialogo de cita masiva, el campo de busqueda se actualiza con el nombre formateado del paciente. Pero como el texto de busqueda sigue siendo truthy, el dropdown de resultados permanece visible. El filtro entonces busca con ese texto nuevo y no encuentra coincidencia exacta, mostrando "No se encontraron pacientes" debajo del paciente ya seleccionado (que aparece como Badge).

## Solucion

En `MassCreateAppointmentDialog.tsx`, cambiar la condicion que muestra el dropdown de resultados para que solo se muestre cuando hay texto de busqueda Y no hay un paciente seleccionado.

**Linea ~572**, cambiar:

```
{patientSearch && (
```

por:

```
{patientSearch && !patientId && (
```

Esto oculta la lista de resultados (y el mensaje "No se encontraron pacientes") en cuanto se selecciona un paciente. Si el usuario borra el texto o cambia la busqueda, `patientId` se deberia limpiar para reactivar la busqueda.

Ademas, agregar un `setPatientId('')` cuando el usuario modifica el campo de busqueda (en el `onChange` del Input) para que al escribir nuevamente se reactive el dropdown:

```typescript
onChange={(e) => {
  setPatientSearch(e.target.value);
  setPatientId('');  // limpiar seleccion al buscar de nuevo
}}
```

## Archivo afectado

| Archivo | Cambio |
|---------|--------|
| `src/components/dialogs/MassCreateAppointmentDialog.tsx` | Agregar `!patientId` a la condicion del dropdown y limpiar `patientId` al cambiar busqueda |
