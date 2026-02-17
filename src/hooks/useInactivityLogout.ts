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
    warningTimer.current = setTimeout(() => {
      toast({
        title: 'Aviso de inactividad',
        description: 'Tu sesión se cerrará en 5 minutos por inactividad.',
      });
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    logoutTimer.current = setTimeout(() => {
      performLogout();
    }, INACTIVITY_TIMEOUT);
  }, [clearTimers, performLogout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Throttle: only reset if enough time passed since last reset
    if (now - lastActivity.current < THROTTLE_MS) return;
    lastActivity.current = now;
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    const events: Array<keyof WindowEventMap> = [
      'mousedown', 'keydown', 'scroll', 'touchstart',
    ];

    // mousemove is handled with built-in throttle via handleActivity
    const allEvents = [...events, 'mousemove'] as Array<keyof WindowEventMap>;

    allEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
    startTimers();

    return () => {
      allEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      clearTimers();
    };
  }, [isAuthenticated, handleActivity, startTimers, clearTimers]);
}
