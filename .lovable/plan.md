

# Fix: Inactivity logout no funciona tras suspensión del equipo

## El problema

El hook `useInactivityLogout` usa `setTimeout` para cerrar sesión después de 60 minutos. **Pero cuando la computadora entra en suspensión, el navegador congela todos los timers (`setTimeout`/`setInterval`)**. El reloj del timer se pausa junto con la máquina.

Ejemplo de Marianela:
1. 20:00 — Última actividad, timer arranca (debería disparar a las 21:00)
2. 20:05 — Computadora entra en suspensión → **timer se congela**
3. 07:00 — Computadora despierta → timer sigue pensando que solo pasaron ~5 min
4. 07:55 — Timer finalmente dispara (¡11 horas después!)

**No hay ningún listener de `visibilitychange`** que verifique el tiempo real al despertar.

## La solución

Agregar un listener de `visibilitychange` que al recuperar foco:
1. Calcule cuánto tiempo real pasó desde `lastActivity`
2. Si pasaron ≥ 60 minutos → logout inmediato
3. Si pasaron entre 55–60 min → mostrar warning y reprogramar timer con el tiempo restante
4. Si pasaron < 55 min → reprogramar timers con el tiempo correcto restante

## Cambio único: `src/hooks/useInactivityLogout.ts`

- Agregar listener de `visibilitychange` dentro del `useEffect` existente
- En el callback: cuando `document.visibilityState === 'visible'`, comparar `Date.now() - lastActivity.current` contra `INACTIVITY_TIMEOUT`
- Si excede → llamar `performLogout()` inmediatamente
- Si está entre warning y timeout → mostrar toast de warning y programar timer solo por el remanente
- Si está dentro del margen → reprogramar timers normalmente con `startTimers()` ajustado

```text
  visibilitychange handler
  ┌─────────────────────────────────────┐
  │ elapsed = now - lastActivity        │
  │                                     │
  │ elapsed >= 60min? → performLogout() │
  │ elapsed >= 55min? → warn + timer    │
  │ else             → startTimers()    │
  └─────────────────────────────────────┘
```

## Archivos modificados
- `src/hooks/useInactivityLogout.ts` (único archivo)

## Resultado
Cuando un usuario deja la sesión abierta overnight y la computadora se suspende, al volver la app detectará inmediatamente que pasaron más de 60 minutos y cerrará la sesión, redirigiendo al login.

