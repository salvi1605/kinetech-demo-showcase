import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * Voice dictation via the browser Web Speech API.
 * Only fills the editable field through `onChange`; it never saves anything
 * and no audio is recorded or stored (the API only returns text).
 */
interface DictationButtonProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const getRecognitionCtor = (): any =>
  typeof window === 'undefined'
    ? undefined
    : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const DictationButton = ({ value, onChange, disabled, className }: DictationButtonProps) => {
  const { toast } = useToast();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseRef = useRef('');
  const finalRef = useRef('');
  const interimRef = useRef('');
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const compose = (withInterim: boolean) => {
    const dictated = (finalRef.current + (withInterim ? interimRef.current : '')).trim();
    if (!dictated) return baseRef.current;
    const base = baseRef.current;
    const sep = base && !/\s$/.test(base) ? ' ' : '';
    return base + sep + dictated;
  };

  const stop = () => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch { /* already stopped */ }
    }
  };

  // Cleanup: stop recognition when the field unmounts (dialog closed, patient changed).
  useEffect(() => () => {
    const rec = recognitionRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try { rec.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
  }, []);

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toast({
        title: 'Dictado no disponible',
        description: 'Tu navegador no admite dictado por voz. Puedes escribir la nota normalmente.',
      });
      return;
    }

    const rec = new Ctor();
    rec.lang = 'es';
    rec.continuous = true;
    rec.interimResults = true;

    baseRef.current = valueRef.current;
    finalRef.current = '';
    interimRef.current = '';

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript ?? '';
        if (res.isFinal) {
          finalRef.current += (finalRef.current && !/\s$/.test(finalRef.current) ? ' ' : '') + text.trim();
        } else {
          interim += text;
        }
      }
      interimRef.current = interim ? ' ' + interim.trim() : '';
      onChangeRef.current(compose(true));
    };

    rec.onerror = (event: any) => {
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        toast({
          title: 'Sin acceso al micrófono',
          description: 'Sin acceso al micrófono. Revisa los permisos del navegador.',
          variant: 'destructive',
        });
      } else if (event?.error === 'audio-capture') {
        toast({
          title: 'Micrófono no detectado',
          description: 'No se encontró un micrófono. Revisa que esté conectado.',
          variant: 'destructive',
        });
      }
      // 'no-speech' / 'aborted' are silent: onend keeps what was dictated.
    };

    rec.onend = () => {
      // Ended by the user or by a pause (common on mobile): keep everything dictated,
      // including the last interim fragment, so nothing is lost.
      if (interimRef.current) {
        finalRef.current += interimRef.current;
        interimRef.current = '';
      }
      onChangeRef.current(compose(false));
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      toast({
        title: 'No se pudo iniciar el dictado',
        description: 'Intenta de nuevo en unos segundos.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      // Keep focus in the textarea so pressing the mic doesn't trigger its blur handler.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => (listening ? stop() : start())}
      aria-pressed={listening}
      aria-label={listening ? 'Detener dictado' : 'Dictar nota por voz'}
      title={listening ? 'Detener dictado' : 'Dictar nota por voz'}
      className={cn('relative h-11 w-11 shrink-0 text-muted-foreground', listening && 'text-destructive', className)}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {listening && (
        <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
      )}
      <span className="sr-only" aria-live="polite">{listening ? 'Dictando…' : ''}</span>
    </Button>
  );
};
