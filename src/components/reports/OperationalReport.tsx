import { useMemo } from 'react';
import { useOperationalReport } from '@/hooks/useReportData';
import { exportToCSV } from '@/utils/reportExport';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface Props {
  dateFrom: string;
  dateTo: string;
  practitionerId?: string;
  groupBy: 'week' | 'month';
}

export default function OperationalReport({ dateFrom, dateTo, practitionerId, groupBy }: Props) {
  const { data, isLoading } = useOperationalReport({ dateFrom, dateTo, practitionerId, groupBy });

  const handleExportCSV = () => {
    if (!data) return;
    exportToCSV('reporte-operativo', 
      ['Período', 'Capacidad', 'Ocupados', 'No-Show', 'Cancelados', '% Ocupación', '% No-Show'],
      data.periods.map(p => [p.label, p.capacity, p.occupied, p.noShows, p.cancelled, p.occupancyPct, p.noShowPct])
    );
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!data || data.periods.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No hay datos para el rango seleccionado.</p>;
  }

  return (
    <div className="report-printable space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Capacidad Total" value={data.totals.capacity} />
        <KPICard label="Ocupados" value={data.totals.occupied} accent />
        <KPICard label="No-Shows" value={data.totals.noShows} warn />
        <KPICard label="Cancelados" value={data.totals.cancelled} />
      </div>

      {/* Trend Chart */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-semibold mb-4 text-foreground">Tendencia de Ocupación</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.periods}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-xs" />
            <YAxis unit="%" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="occupancyPct" name="% Ocupación" stroke="hsl(var(--primary))" strokeWidth={2} />
            <Line type="monotone" dataKey="noShowPct" name="% No-Show" stroke="hsl(var(--destructive))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b no-print">
          <h3 className="font-semibold text-foreground">Detalle por Período</h3>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Capacidad</TableHead>
              <TableHead className="text-right">Ocupados</TableHead>
              <TableHead className="text-right">No-Show</TableHead>
              <TableHead className="text-right">Cancelados</TableHead>
              <TableHead className="text-right">% Ocupación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.periods.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{p.label}</TableCell>
                <TableCell className="text-right">{p.capacity}</TableCell>
                <TableCell className="text-right">{p.occupied}</TableCell>
                <TableCell className="text-right text-destructive">{p.noShows}</TableCell>
                <TableCell className="text-right">{p.cancelled}</TableCell>
                <TableCell className="text-right font-semibold">{p.occupancyPct}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function KPICard({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${warn ? 'text-destructive' : accent ? 'text-primary' : 'text-foreground'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
