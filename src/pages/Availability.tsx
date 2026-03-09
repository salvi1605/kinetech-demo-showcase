import { useState, useEffect, useCallback } from 'react';
import { Clock, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AvailabilityEditor, type AvailabilityDay } from '@/components/practitioners/AvailabilityEditor';
import { EmptyState } from '@/components/shared/EmptyState';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useApp } from '@/contexts/AppContext';
import { usePractitioners } from '@/hooks/usePractitioners';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { dbAvailabilityToEditor, dayKeyToNumber, getActiveDaysSummary } from '@/utils/availabilityHelpers';

type PractitionerAvailabilityMap = Record<string, AvailabilityDay[]>;

export const Availability = () => {
  const { state } = useApp();
  const clinicId = state.currentClinicId;
  const { practitioners, loading: loadingPractitioners } = usePractitioners(clinicId);

  const [availabilityMap, setAvailabilityMap] = useState<PractitionerAvailabilityMap>({});
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch all availability for the clinic in one query
  const fetchAllAvailability = useCallback(async () => {
    if (!clinicId) {
      setLoadingAvailability(false);
      return;
    }
    try {
      setLoadingAvailability(true);
      const { data, error } = await supabase
        .from('practitioner_availability')
        .select('practitioner_id, weekday, from_time, to_time, capacity')
        .eq('clinic_id', clinicId);

      if (error) throw error;

      // Group by practitioner_id
      const grouped: Record<string, { weekday: number; from_time: string; to_time: string; capacity?: number | null }[]> = {};
      (data || []).forEach(row => {
        if (!grouped[row.practitioner_id]) grouped[row.practitioner_id] = [];
        grouped[row.practitioner_id].push(row);
      });

      // Convert to editor format for each practitioner
      const map: PractitionerAvailabilityMap = {};
      practitioners.forEach(p => {
        map[p.id] = dbAvailabilityToEditor(grouped[p.id] || []);
      });

      setAvailabilityMap(map);
    } catch (err) {
      console.error('Error fetching availability:', err);
      toast({ title: 'Error', description: 'No se pudo cargar la disponibilidad', variant: 'destructive' });
    } finally {
      setLoadingAvailability(false);
    }
  }, [clinicId, practitioners]);

  useEffect(() => {
    if (practitioners.length > 0) {
      fetchAllAvailability();
    } else if (!loadingPractitioners) {
      setLoadingAvailability(false);
    }
  }, [practitioners, loadingPractitioners, fetchAllAvailability]);

  const handleChange = (practitionerId: string, value: AvailabilityDay[]) => {
    setAvailabilityMap(prev => ({ ...prev, [practitionerId]: value }));
  };

  const handleSave = async (practitionerId: string) => {
    if (!clinicId) return;
    const availability = availabilityMap[practitionerId];
    if (!availability) return;

    // Validate
    const activeDays = availability.filter(d => d.active);
    for (const day of activeDays) {
      for (const slot of day.slots) {
        if (slot.from >= slot.to) {
          toast({ title: 'Error de validación', description: "'Hasta' debe ser mayor que 'Desde'", variant: 'destructive' });
          return;
        }
      }
      for (let i = 0; i < day.slots.length; i++) {
        for (let j = i + 1; j < day.slots.length; j++) {
          const a = day.slots[i], b = day.slots[j];
          if ((a.from < b.to && a.to > b.from) || (b.from < a.to && b.to > a.from)) {
            toast({ title: 'Error de validación', description: 'Los horarios no deben superponerse', variant: 'destructive' });
            return;
          }
        }
      }
    }

    setSavingId(practitionerId);
    try {
      // Delete existing
      await supabase
        .from('practitioner_availability')
        .delete()
        .eq('practitioner_id', practitionerId);

      // Insert new
      const rows = activeDays.flatMap(day =>
        day.slots.map(slot => ({
          clinic_id: clinicId,
          practitioner_id: practitionerId,
          weekday: dayKeyToNumber[day.day],
          from_time: slot.from,
          to_time: slot.to,
          slot_minutes: 30,
          capacity: 1,
        }))
      );

      if (rows.length > 0) {
        const { error } = await supabase.from('practitioner_availability').insert(rows);
        if (error) throw error;
      }

      toast({ title: 'Disponibilidad guardada', description: 'Los horarios se actualizaron correctamente' });
    } catch (err: any) {
      console.error('Error saving availability:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo guardar la disponibilidad', variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const isLoading = loadingPractitioners || loadingAvailability;

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          Disponibilidad
        </h1>
        <p className="text-muted-foreground">
          Gestiona los horarios de disponibilidad de cada profesional
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : practitioners.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12" />}
          title="Sin profesionales"
          description="Agrega profesionales a la clínica para configurar su disponibilidad."
        />
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {practitioners.map(p => {
            const avail = availabilityMap[p.id] || [];
            const summary = getActiveDaysSummary(avail);
            const isSaving = savingId === p.id;

            return (
              <AccordionItem key={p.id} value={p.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <p className="text-sm text-muted-foreground">{summary}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <AvailabilityEditor
                    value={avail}
                    onChange={(val) => handleChange(p.id, val)}
                  />
                  <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']}>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={() => handleSave(p.id)} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Guardar cambios
                      </Button>
                    </div>
                  </RoleGuard>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};
