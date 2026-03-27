import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 min
const WARNING_BEFORE = 5 * 60 * 1000;      // 5 min antes
const THROTTLE_MS = 30_000;                 // throttle mousemove cada 30s

type Dispatch = (action: { type: 'LOGOUT' }) => void;

export function useInactivityLogout(isAuthenticated: boolean, dispatch: Dispatch) {
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastActivity = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  const performLogout = useCallback(async () => {
    toast({
      title: 'Sesión cerrada por inactividad',
      description: 'No se detectó actividad durante 60 minutos.',
    });
    await supabase.auth.signOut();
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  const startTimers = useCallback(() => {
    clearTimers();
    const elapsed = Date.now() - lastActivity.current;
    const remaining = INACTIVITY_TIMEOUT - elapsed;

    if (remaining <= 0) {
      performLogout();
      return;
    }

    const warningAt = remaining - WARNING_BEFORE;
    if (warningAt > 0) {
      warningTimer.current = setTimeout(() => {
        toast({
          title: 'Aviso de inactividad',
          description: 'Tu sesión se cerrará en 5 minutos por inactividad.',
        });
      }, warningAt);
    }

    logoutTimer.current = setTimeout(() => {
      performLogout();
    }, remaining);
  }, [clearTimers, performLogout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivity.current < THROTTLE_MS) return;
    lastActivity.current = now;
    startTimers();
  }, [startTimers]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    const elapsed = Date.now() - lastActivity.current;

    if (elapsed >= INACTIVITY_TIMEOUT) {
      performLogout();
    } else if (elapsed >= INACTIVITY_TIMEOUT - WARNING_BEFORE) {
      toast({
        title: 'Aviso de inactividad',
        description: 'Tu sesión se cerrará pronto por inactividad.',
      });
      startTimers();
    } else {
      startTimers();
    }
  }, [performLogout, startTimers]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    const events: Array<keyof WindowEventMap> = [
      'mousedown', 'keydown', 'scroll', 'touchstart',
    ];
    const allEvents = [...events, 'mousemove'] as Array<keyof WindowEventMap>;

    allEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startTimers();

    return () => {
      allEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimers();
    };
  }, [isAuthenticated, handleActivity, handleVisibilityChange, startTimers, clearTimers]);
}
