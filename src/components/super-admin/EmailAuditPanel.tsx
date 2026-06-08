import { useEffect, useMemo, useState } from 'react';
import { Mail, Search, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_SIZE = 50;

interface ClinicOption {
  id: string;
  name: string;
}

interface AuditRow {
  id: string;
  created_at: string;
  clinic_id: string | null;
  clinic_name: string | null;
  user_id: string | null;
  user_full_name: string | null;
  user_email: string | null;
  appointment_id: string | null;
  recipient_email: string | null;
  template_name: string | null;
  was_test: boolean;
  total_count: number;
}

interface Props {
  clinics: ClinicOption[];
}

const defaultFromDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return format(d, "yyyy-MM-dd");
};

const defaultToDate = () => format(new Date(), "yyyy-MM-dd");

export function EmailAuditPanel({ clinics }: Props) {
  const [clinicId, setClinicId] = useState<string>('ALL');
  const [recipient, setRecipient] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(defaultFromDate());
  const [dateTo, setDateTo] = useState<string>(defaultToDate());
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const load = async (resetPage = false) => {
    const targetPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);
    setIsLoading(true);
    try {
      const fromIso = dateFrom ? new Date(dateFrom + 'T00:00:00').toISOString() : null;
      const toIso = dateTo ? new Date(dateTo + 'T23:59:59.999').toISOString() : null;

      const { data, error } = await supabase.rpc('get_appointment_email_audit', {
        p_clinic_id: clinicId === 'ALL' ? null : clinicId,
        p_recipient: recipient.trim() ? recipient.trim() : null,
        p_date_from: fromIso,
        p_date_to: toIso,
        p_limit: PAGE_SIZE,
        p_offset: targetPage * PAGE_SIZE,
      });

      if (error) throw error;
      const list = (data || []) as AuditRow[];
      setRows(list);
      setTotal(list.length > 0 ? Number(list[0].total_count) : 0);
    } catch (err: any) {
      console.error('Error cargando auditoría de emails:', err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo cargar la auditoría',
        variant: 'destructive',
      });
      setRows([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Carga inicial y al cambiar de página
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApplyFilters = () => load(true);

  const handleReset = () => {
    setClinicId('ALL');
    setRecipient('');
    setDateFrom(defaultFromDate());
    setDateTo(defaultToDate());
    setPage(0);
    // load se dispara con useEffect tras setPage(0) si ya estaba en 0 no se ejecuta —
    // forzamos manualmente:
    setTimeout(() => load(true), 0);
  };

  const shortId = (id: string | null) => (id ? id.slice(0, 8) : '—');

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Auditoría de envíos de información de turno</CardTitle>
            <CardDescription className="text-xs">
              Registro de todos los envíos manuales realizados desde el detalle de cita
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ea-clinic" className="text-xs">Clínica</Label>
            <Select value={clinicId} onValueChange={setClinicId}>
              <SelectTrigger id="ea-clinic" className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las clínicas</SelectItem>
                {clinics.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ea-recipient" className="text-xs">Destinatario</Label>
            <Input
              id="ea-recipient"
              placeholder="correo o parte del correo"
              className="h-9"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleApplyFilters(); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ea-from" className="text-xs">Desde</Label>
            <Input
              id="ea-from"
              type="date"
              className="h-9"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ea-to" className="text-xs">Hasta</Label>
            <Input
              id="ea-to"
              type="date"
              className="h-9"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleApplyFilters} disabled={isLoading}>
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Aplicar filtros
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset} disabled={isLoading}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Limpiar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => load(false)} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {total} registro{total === 1 ? '' : 's'}
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-md border border-border/60 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                <TableHead>Clínica</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead className="whitespace-nowrap">Turno</TableHead>
                <TableHead className="text-right">Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Sin envíos para los filtros seleccionados
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm">{r.clinic_name || '—'}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.user_full_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{r.user_email || ''}</div>
                    </TableCell>
                    <TableCell className="text-sm break-all">{r.recipient_email || '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {shortId(r.appointment_id)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.was_test ? (
                        <Badge variant="secondary" className="text-[10px]">Prueba</Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px]">Real</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Página {page + 1} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0 || isLoading}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages - 1 || isLoading}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
