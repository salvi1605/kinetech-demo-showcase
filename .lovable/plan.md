

## Limpieza: eliminar WeekNavigator duplicado

### Resumen
`WeekNavigator.tsx` es código muerto (no se importa en ninguna parte). Solo `WeekNavigatorCompact.tsx` está activo. Eliminar el archivo muerto.

### Cambio único
**Eliminar: `src/components/navigation/WeekNavigator.tsx`**

### Sin impacto
- Ningún archivo lo importa, por lo tanto cero riesgo de romper algo
- `WeekNavigatorCompact` ya tiene el DatePicker integrado del paso anterior

