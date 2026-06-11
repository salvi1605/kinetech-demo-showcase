import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  dark_theme: boolean;
  compact_view: boolean;
}

const DEFAULTS: UserPreferences = {
  email_notifications: false,
  push_notifications: false,
  dark_theme: false,
  compact_view: false,
};

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setUserId(user.id);

      const { data, error } = await supabase
        .from('user_preferences')
        .select('email_notifications, push_notifications, dark_theme, compact_view')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Error loading user preferences:', error);
      } else if (data) {
        setPrefs({
          email_notifications: !!data.email_notifications,
          push_notifications: !!data.push_notifications,
          dark_theme: !!data.dark_theme,
          compact_view: !!data.compact_view,
        });
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const updatePref = useCallback(
    async (key: keyof UserPreferences, value: boolean) => {
      if (!userId) {
        toast.error('Sesión no disponible');
        return;
      }
      const previous = prefs[key];
      // Actualización optimista
      setPrefs((p) => ({ ...p, [key]: value }));
      setSaving(true);
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: userId,
              ...prefs,
              [key]: value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        if (error) throw error;
      } catch (err: any) {
        console.error('Error saving user preference:', err);
        // Revertir
        setPrefs((p) => ({ ...p, [key]: previous }));
        toast.error(err.message || 'No se pudo guardar la preferencia');
      } finally {
        setSaving(false);
      }
    },
    [userId, prefs]
  );

  return { prefs, loading, saving, updatePref };
}
