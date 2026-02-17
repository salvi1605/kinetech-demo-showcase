import { useState, useEffect, useCallback } from 'react';
import { format, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Plus, AlertTriangle, Trash2, Pencil, Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { NewExceptionDialog } from '@/components/dialogs/NewExceptionDialog';
import { NewHolidayDialog } from '@/components/dialogs/NewHolidayDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ALL_ARGENTINE_HOLIDAYS } from '@/constants/argentineHolidays';
import type { ScheduleExceptionRow, HolidayRow } from '@/hooks/useScheduleExceptions';

const TYPE_LABELS: Record<string, string> = {
  clinic_closed: 'Día cerrado',
  practitioner_block: 'Bloqueo profesional',
  extended_hours: 'Horario extendido',
};

const TYPE_BADGES: Record<string, string> = {
  clinic_closed: 'bg-red-100 text-red-800',
  practitioner_block: 'bg-amber-100 text-amber-800',
  extended_hours: 'bg-blue-100 text-blue-800',
};

export const Exceptions = () => {
  const { state } = useApp();
  const { toast } = useToast();
  const clinicId = state.currentClinicId;

  const [exceptions, setExceptions] = useState<ScheduleExceptionRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPractitioner, setFilterPractitioner] = useState<string>('all');

  // Dialogs
  const [showNewException, setShowNewException] = useState(false);
  const [editingException, setEditingException] = useState<ScheduleExceptionRow | null>(null);
  const [showNewHoliday, setShowNewHoliday] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'exception' | 'holiday'; id: string } | null>(null);
  const [loadingHolidaysBulk, setLoadingHolidaysBulk] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [excRes, holRes] = await Promise.all([
        supabase
          .from('schedule_exceptions')
          .select('*')
          .eq('clinic_id', clinicId)
          .order('date', { ascending: false }),
        supabase
          .from('holiday_calendar')
          .select('*')
          .or(`clinic_id.eq.${clinicId},clinic_id.is.null`)
          .order('date', { ascending: true }),
      ]);

      setExceptions((excRes.data || []) as ScheduleExceptionRow[]);
      setHolidays((holRes.data || []) as HolidayRow[]);
    } catch (err) {
      console.error('Error fetching exceptions:', err);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [clinicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Listen for updates
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('exceptionsUpdated', handler);
    return () => window.removeEventListener('exceptionsUpdated', handler);
  }, [fetchData]);

  // Practitioner name lookup
  const getPractitionerName = (id: string | null) => {
    if (!id) return '—';
    return state.practitioners.find(p => p.id === id)?.name || 'Desconocido';
  };

  // Filter exceptions
  const filteredExceptions = exceptions.filter(exc => {
    if (filterType !== 'all' && exc.type !== filterType) return false;
    if (filterPractitioner !== 'all' && exc.practitioner_id !== filterPractitioner) return false;
    return true;
  });

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const table = deleteTarget.type === 'exception' ? 'schedule_exceptions' : 'holiday_calendar';
      const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: `${deleteTarget.type === 'exception' ? 'Excepción' : 'Feriado'} eliminado` });
      window.dispatchEvent(new Event('exceptionsUpdated'));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  // Bulk load Argentine holidays
  const loadArgentineHolidays = async () => {
    if (!clinicId) return;
    setLoadingHolidaysBulk(true);
    try {
      // Get existing holidays to avoid duplicates
      const existingDates = new Set(holidays.map(h => h.date));
      const currentYear = new Date().getFullYear();
      const toInsert = ALL_ARGENTINE_HOLIDAYS
        .filter(h => {
          const year = parseInt(h.date.substring(0, 4));
          return (year === currentYear || year === currentYear + 1) && !existingDates.has(h.date);
        })
        .map(h => ({
          clinic_id: clinicId,
          name: h.name,
          date: h.date,
          country_code: 'AR',
        }));

      if (toInsert.length === 0) {
        toast({ title: 'Sin cambios', description: 'Todos los feriados ya están cargados' });
        return;
      }

      const { error } = await supabase.from('holiday_calendar').insert(toInsert);
      if (error) throw error;

      toast({ title: 'Feriados cargados', description: `Se agregaron ${toInsert.length} feriados` });
      window.dispatchEvent(new Event('exceptionsUpdated'));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingHolidaysBulk(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Excepciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona días feriados, bloqueos y horarios especiales
          </p>
        </div>
        <Button onClick={() => { setEditingException(null); setShowNewException(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Excepción
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="exceptions">
        <TabsList>
          <TabsTrigger value="exceptions">Excepciones ({exceptions.length})</TabsTrigger>
          <TabsTrigger value="holidays">Feriados ({holidays.length})</TabsTrigger>
        </TabsList>

        {/* Tab: Excepciones */}
        <TabsContent value="exceptions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="clinic_closed">Día cerrado</SelectItem>
                <SelectItem value="practitioner_block">Bloqueo profesional</SelectItem>
                <SelectItem value="extended_hours">Horario extendido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPractitioner} onValueChange={setFilterPractitioner}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por profesional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {state.practitioners.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(loading && !initialLoaded) ? (
            <Card className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 w-full rounded bg-muted animate-pulse" />
              ))}
            </Card>
          ) : filteredExceptions.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-12 w-12" />}
              title="No hay excepciones"
              description="Crea una excepción para bloquear días o rangos horarios"
              action={{
                label: 'Crear excepción',
                onClick: () => { setEditingException(null); setShowNewException(true); },
              }}
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Profesional</TableHead>
                    <TableHead className="hidden md:table-cell">Horario</TableHead>
                    <TableHead className="hidden lg:table-cell">Motivo</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExceptions.map(exc => (
                    <TableRow key={exc.id}>
                      <TableCell className="font-medium">
                        {format(new Date(exc.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 text-xs rounded ${TYPE_BADGES[exc.type] || ''}`}>
                          {TYPE_LABELS[exc.type] || exc.type}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getPractitionerName(exc.practitioner_id)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {exc.from_time && exc.to_time
                          ? `${exc.from_time.substring(0, 5)} - ${exc.to_time.substring(0, 5)}`
                          : 'Todo el día'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                        {exc.reason || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingException(exc); setShowNewException(true); }}
                            aria-label="Editar excepción"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ type: 'exception', id: exc.id })}
                            aria-label="Eliminar excepción"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Feriados */}
        <TabsContent value="holidays" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => { setEditingHoliday(null); setShowNewHoliday(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar feriado
            </Button>
            <Button variant="outline" onClick={loadArgentineHolidays} disabled={loadingHolidaysBulk}>
              {loadingHolidaysBulk ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
              Cargar feriados AR {new Date().getFullYear()}/{new Date().getFullYear() + 1}
            </Button>
          </div>

          {(loading && !initialLoaded) ? (
            <Card className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 w-full rounded bg-muted animate-pulse" />
              ))}
            </Card>
          ) : holidays.length === 0 ? (
            <EmptyState
              icon={<Flag className="h-12 w-12" />}
              title="No hay feriados cargados"
              description="Agrega feriados manualmente o carga los feriados argentinos automáticamente"
              action={{
                label: 'Cargar feriados AR',
                onClick: loadArgentineHolidays,
              }}
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">País</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map(hol => (
                    <TableRow key={hol.id}>
                      <TableCell className="font-medium">
                        {format(new Date(hol.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>{hol.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {hol.country_code || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingHoliday(hol); setShowNewHoliday(true); }}
                            aria-label="Editar feriado"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ type: 'holiday', id: hol.id })}
                            aria-label="Eliminar feriado"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewExceptionDialog
        open={showNewException}
        onOpenChange={setShowNewException}
        editingException={editingException}
      />
      <NewHolidayDialog
        open={showNewHoliday}
        onOpenChange={setShowNewHoliday}
        editingHoliday={editingHoliday}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteTarget?.type === 'exception' ? 'excepción' : 'feriado'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
